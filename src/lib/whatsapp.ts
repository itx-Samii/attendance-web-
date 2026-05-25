/**
 * WhatsApp Notification Client — replaces Twilio
 *
 * Uses whatsapp-web.js to send messages via your personal WhatsApp account.
 * Maintains a singleton client across hot-reloads in Next.js dev mode
 * by storing it on the global object.
 *
 * States:
 *   'initialising'  — Puppeteer / session booting
 *   'qr'            — Waiting for QR scan; qrDataUrl holds a PNG data URI
 *   'ready'         — Session active; messages can be sent
 *   'disconnected'  — Session destroyed or auth failure
 */

import { readTable } from './db';
import qrcode from 'qrcode';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WhatsAppStatus = 'initialising' | 'qr' | 'ready' | 'disconnected';

export interface WhatsAppState {
  status: WhatsAppStatus;
  qrDataUrl?: string;   // base64 PNG for the browser to display
  error?: string;
}

export interface SendResult {
  success: boolean;
  mode: 'WhatsApp' | 'Simulator';
  messageId?: string;
  error?: string;
}

// ── Global singleton (survives Next.js hot-reload in dev) ─────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __waClient: any | undefined;
  // eslint-disable-next-line no-var
  var __waState: WhatsAppState;
  // eslint-disable-next-line no-var
  var __waInitialising: boolean;

  // Multi-tenant mappings
  // eslint-disable-next-line no-var
  var __waClients: Record<string, any> | undefined;
  // eslint-disable-next-line no-var
  var __waStates: Record<string, WhatsAppState> | undefined;
  // eslint-disable-next-line no-var
  var __waInitialisingMap: Record<string, boolean> | undefined;
}

// Initialise global variables
if (!global.__waState) {
  global.__waState = { status: 'disconnected' };
}
if (global.__waInitialising === undefined) {
  global.__waInitialising = false;
}
if (!global.__waClients) {
  global.__waClients = {};
}
if (!global.__waStates) {
  global.__waStates = {};
}
if (!global.__waInitialisingMap) {
  global.__waInitialisingMap = {};
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClient(schoolId: string): any | undefined {
  if (schoolId === 'school-aura') {
    return global.__waClient;
  }
  return global.__waClients?.[schoolId];
}

function setClient(schoolId: string, client: any | undefined): void {
  if (schoolId === 'school-aura') {
    global.__waClient = client;
  } else {
    if (global.__waClients) {
      if (client === undefined) {
        delete global.__waClients[schoolId];
      } else {
        global.__waClients[schoolId] = client;
      }
    }
  }
}

function getState(schoolId: string): WhatsAppState {
  if (schoolId === 'school-aura') {
    return global.__waState;
  }
  return global.__waStates?.[schoolId] || { status: 'disconnected' };
}

function setState(schoolId: string, state: WhatsAppState): void {
  if (schoolId === 'school-aura') {
    global.__waState = state;
  } else {
    if (global.__waStates) {
      global.__waStates[schoolId] = state;
    }
  }
}

function getInitialising(schoolId: string): boolean {
  if (schoolId === 'school-aura') {
    return global.__waInitialising;
  }
  return global.__waInitialisingMap?.[schoolId] || false;
}

function setInitialising(schoolId: string, val: boolean): void {
  if (schoolId === 'school-aura') {
    global.__waInitialising = val;
  } else {
    if (global.__waInitialisingMap) {
      global.__waInitialisingMap[schoolId] = val;
    }
  }
}

/**
 * Converts a WhatsApp phone number to the correct JID format.
 * '+923001234567' → '923001234567@c.us'
 */
function toWhatsAppId(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@c.us`;
}

// ── Client Initialisation ─────────────────────────────────────────────────────

/**
 * Lazily initialises the WhatsApp client singleton for a specific school.
 * Safe to call multiple times — returns immediately if already running.
 */
export async function initWhatsAppClient(schoolId: string = 'school-aura'): Promise<void> {
  // Already initialised or in-progress
  if (getClient(schoolId) || getInitialising(schoolId)) return;

  // Mark as initialising to prevent concurrent boot-ups
  setInitialising(schoolId, true);
  setState(schoolId, { status: 'initialising' });

  try {
    // Dynamic import — keeps whatsapp-web.js out of the client bundle
    const { Client, LocalAuth } = await import('whatsapp-web.js');

    // Use system-installed Chrome instead of Puppeteer's bundled Chromium
    // (we skipped the Chromium download to save disk space)
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Users\\' + (process.env.USERNAME || 'HP') + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];

    // Try to find an available Chrome executable
    const { existsSync } = await import('fs');
    const executablePath = chromePaths.find(p => existsSync(p));

    if (!executablePath) {
      throw new Error(
        'Chrome not found on this system. Please install Google Chrome from https://www.google.com/chrome/ and restart the server.'
      );
    }

    console.log(`[WhatsApp - ${schoolId}] Using Chrome at:`, executablePath);

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: schoolId,
        dataPath: 'data/wwebjs_auth',
      }),
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',
      },
      puppeteer: {
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    // ── Event handlers ──────────────────────────────────────────────────────

    client.on('qr', async (qr: string) => {
      console.log(`[WhatsApp - ${schoolId}] QR code generated — please scan in Settings → Gateway`);
      try {
        const dataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 280 });
        setState(schoolId, { status: 'qr', qrDataUrl: dataUrl });
      } catch {
        setState(schoolId, { status: 'qr' });
      }
    });

    client.on('ready', () => {
      console.log(`[WhatsApp - ${schoolId}] ✅ Client ready — session authenticated`);
      setState(schoolId, { status: 'ready' });
    });

    client.on('authenticated', () => {
      console.log(`[WhatsApp - ${schoolId}] Session authenticated successfully`);
    });

    client.on('auth_failure', (msg: string) => {
      console.error(`[WhatsApp - ${schoolId}] Auth failure:`, msg);
      setState(schoolId, { status: 'disconnected', error: msg });
      setClient(schoolId, undefined);
      setInitialising(schoolId, false);
    });

    client.on('disconnected', (reason: string) => {
      console.warn(`[WhatsApp - ${schoolId}] Client disconnected:`, reason);
      setState(schoolId, { status: 'disconnected', error: reason });
      setClient(schoolId, undefined);
      setInitialising(schoolId, false);
    });

    setClient(schoolId, client);
    await client.initialize();

  } catch (err: any) {
    console.error(`[WhatsApp - ${schoolId}] Failed to initialise client:`, err?.message || err);
    setState(schoolId, { status: 'disconnected', error: err?.message || 'Init failed' });
    setInitialising(schoolId, false);
    setClient(schoolId, undefined);
  }
}

// ── Status ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current WhatsApp connection state for a specific school.
 * Also triggers a lazy initialisation if the client hasn't started yet.
 */
export function getWhatsAppStatus(schoolId: string = 'school-aura'): WhatsAppState {
  // Boot the client on first status check
  if (!getClient(schoolId) && !getInitialising(schoolId)) {
    initWhatsAppClient(schoolId).catch(() => {});
  }
  return getState(schoolId);
}

// ── Logout ────────────────────────────────────────────────────────────────────

/**
 * Destroys the current WhatsApp session for a specific school.
 * Forces a new QR scan on the next connection attempt.
 */
export async function logoutWhatsApp(schoolId: string = 'school-aura'): Promise<void> {
  const client = getClient(schoolId);
  if (client) {
    try {
      await client.logout();
    } catch { /* ignore errors on logout */ }
    try {
      await client.destroy();
    } catch { /* ignore */ }
  }
  setClient(schoolId, undefined);
  setInitialising(schoolId, false);
  setState(schoolId, { status: 'disconnected' });
}

// ── Send Alert ────────────────────────────────────────────────────────────────

/**
 * Sends a WhatsApp message to a parent phone number.
 * Falls back to the console Simulator if the client is not ready or
 * if useSimulator is set to true in the DB settings.
 */
export async function sendWhatsAppAlert(to: string, body: string, schoolId?: string): Promise<SendResult> {
  const targetSchoolId = schoolId || 'school-aura';

  // Check DB settings for simulator override scoped to the school
  let useSimulator = true;
  try {
    const schools = await readTable<any>('schools');
    const school = schools.find((s) => s.schoolId === targetSchoolId);
    if (school) {
      useSimulator = school.useSimulator !== false;
    } else {
      // Fallback to settings table (critical for backward compatibility and unit tests)
      const settingsArr = await readTable<any>('settings');
      if (settingsArr.length > 0) {
        useSimulator = settingsArr[0].useSimulator !== false;
      }
    }
  } catch (err) {
    console.error(`[WhatsApp - ${targetSchoolId}] Failed to read settings:`, err);
  }

  const client = getClient(targetSchoolId);
  const clientReady = getState(targetSchoolId)?.status === 'ready' && client;

  // ── Real WhatsApp send ───────────────────────────────────────────────────
  if (!useSimulator && clientReady) {
    try {
      const chatId = toWhatsAppId(to);
      const msg = await client.sendMessage(chatId, body);
      return {
        success: true,
        mode: 'WhatsApp',
        messageId: msg?.id?._serialized || msg?.id?.id || 'sent',
      };
    } catch (err: any) {
      console.error(`[WhatsApp - ${targetSchoolId}] Send failed:`, err?.message || err);
      return {
        success: false,
        mode: 'WhatsApp',
        error: err?.message || 'WhatsApp send error',
      };
    }
  }

  // ── Simulator fallback ───────────────────────────────────────────────────
  const mockId = 'WA' + Math.random().toString(36).substring(2, 11).toUpperCase();

  console.log('\n==================================================');
  console.log(` 📱 AURA ATTENDANCE — WHATSAPP SIMULATOR (${targetSchoolId}) `);
  console.log('==================================================');
  console.log(`[Status]   MOCK WHATSAPP DISPATCH LOGGED`);
  console.log(`[Target]   Parent Contact: ${to}`);
  console.log(`[Mock ID]  ${mockId}`);
  console.log(`[Message]  "${body}"`);
  console.log('==================================================\n');

  return {
    success: true,
    mode: 'Simulator',
    messageId: mockId,
  };
}
