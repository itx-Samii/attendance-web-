/**
 * ============================================================
 * WHITE-BOX UNIT TESTS — src/lib/whatsapp.ts
 * ============================================================
 * Tests internal branches of sendWhatsAppAlert:
 *   - Simulator path (useSimulator: true or client not ready)
 *   - Real WhatsApp path (client ready, useSimulator: false)
 *   - DB-forced Simulator mode (settings.useSimulator: true)
 *   - WhatsApp client send failure → error result (no throw)
 *   - Mock message ID generation format (WA + alphanumeric)
 *   - getWhatsAppStatus returns current global state
 * ============================================================
 */

import * as db from '@/lib/db';

// ──────────────────────────────────────────────
// Hoist mocks before module import
// ──────────────────────────────────────────────
jest.mock('@/lib/db', () => ({
  readTable: jest.fn(),
  writeTable: jest.fn(),
}));

// Mock the whatsapp-web.js module entirely (heavy Puppeteer dep)
jest.mock('whatsapp-web.js', () => {
  const mockSendMessage = jest.fn();
  const MockClient = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    initialize: jest.fn().mockResolvedValue(undefined),
    sendMessage: mockSendMessage,
    logout: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  }));
  (MockClient as any).__mockSendMessage = mockSendMessage;
  return { Client: MockClient, LocalAuth: jest.fn() };
});

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
  default: { toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock') },
}));

import { sendWhatsAppAlert, getWhatsAppStatus, logoutWhatsApp } from '@/lib/whatsapp';

const mockReadTable = db.readTable as jest.MockedFunction<typeof db.readTable>;

// Reset global state between tests
beforeEach(() => {
  jest.resetAllMocks();
  global.__waClient = undefined;
  global.__waInitialising = false;
  global.__waState = { status: 'disconnected' };
});

// ════════════════════════════════════════════════════════════
// ① Simulator mode — client not ready
// ════════════════════════════════════════════════════════════
describe('sendWhatsAppAlert — Simulator mode (client not ready)', () => {
  beforeEach(() => {
    // Settings table returns useSimulator: true
    mockReadTable.mockResolvedValue([{ useSimulator: true }] as any);
    // Ensure client is NOT ready
    global.__waState = { status: 'disconnected' };
    global.__waClient = undefined;
  });

  it('returns success:true with mode:Simulator when client not ready', async () => {
    const result = await sendWhatsAppAlert('+923001234567', 'Test alert');
    expect(result.success).toBe(true);
    expect(result.mode).toBe('Simulator');
  });

  it('generates a mock ID starting with WA', async () => {
    const result = await sendWhatsAppAlert('+923001234567', 'Hello');
    expect(result.messageId).toMatch(/^WA[A-Z0-9]{9}$/i);
  });

  it('does NOT throw even in simulator mode', async () => {
    await expect(sendWhatsAppAlert('+1', 'msg')).resolves.toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════
// ② DB-forced Simulator mode (useSimulator: true)
// ════════════════════════════════════════════════════════════
describe('sendWhatsAppAlert — DB-forced Simulator mode', () => {
  it('uses Simulator when settings.useSimulator is true even when client is ready', async () => {
    // Client IS ready but settings force simulator
    global.__waState = { status: 'ready' };
    global.__waClient = { sendMessage: jest.fn().mockResolvedValue({ id: { _serialized: 'wamid.test' } }) };

    mockReadTable.mockResolvedValue([{ useSimulator: true }] as any);

    const result = await sendWhatsAppAlert('+923001234567', 'Forced simulator');
    expect(result.mode).toBe('Simulator');
    // sendMessage should NOT have been called
    expect(global.__waClient!.sendMessage).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════
// ③ Real WhatsApp mode (client ready, useSimulator: false)
// ════════════════════════════════════════════════════════════
describe('sendWhatsAppAlert — Real WhatsApp mode', () => {
  beforeEach(() => {
    global.__waState = { status: 'ready' };
    mockReadTable.mockResolvedValue([{ useSimulator: false }] as any);
  });

  it('returns success:true with mode:WhatsApp when send succeeds', async () => {
    const mockSend = jest.fn().mockResolvedValue({ id: { _serialized: 'wamid.success123' } });
    global.__waClient = { sendMessage: mockSend };

    const result = await sendWhatsAppAlert('+923001234567', 'Real message');
    expect(result.success).toBe(true);
    expect(result.mode).toBe('WhatsApp');
    expect(result.messageId).toBe('wamid.success123');
  });

  it('converts phone number to @c.us format', async () => {
    const mockSend = jest.fn().mockResolvedValue({ id: { _serialized: 'wamid.x' } });
    global.__waClient = { sendMessage: mockSend };

    await sendWhatsAppAlert('+923001234567', 'Format test');
    expect(mockSend).toHaveBeenCalledWith('923001234567@c.us', 'Format test');
  });

  it('strips + from phone numbers correctly', async () => {
    const mockSend = jest.fn().mockResolvedValue({ id: { _serialized: 'wamid.x' } });
    global.__waClient = { sendMessage: mockSend };

    await sendWhatsAppAlert('+447700900123', 'UK number');
    expect(mockSend).toHaveBeenCalledWith('447700900123@c.us', 'UK number');
  });

  it('returns success:false when WhatsApp send throws an error', async () => {
    const mockSend = jest.fn().mockRejectedValue(new Error('WhatsApp send error'));
    global.__waClient = { sendMessage: mockSend };

    const result = await sendWhatsAppAlert('+923001234567', 'Will fail');
    expect(result.success).toBe(false);
    expect(result.mode).toBe('WhatsApp');
    expect(result.error).toBe('WhatsApp send error');
  });

  it('does NOT throw even when WhatsApp send fails', async () => {
    const mockSend = jest.fn().mockRejectedValue(new Error('fatal'));
    global.__waClient = { sendMessage: mockSend };

    await expect(sendWhatsAppAlert('+1', 'msg')).resolves.toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════
// ④ DB settings failure fallback
// ════════════════════════════════════════════════════════════
describe('sendWhatsAppAlert — DB read failure', () => {
  it('falls back to simulator when readTable rejects', async () => {
    mockReadTable.mockRejectedValue(new Error('Disk I/O failure'));
    global.__waState = { status: 'disconnected' };

    const result = await sendWhatsAppAlert('+923001234567', 'Fallback test');
    // No client + DB failure → simulator
    expect(result.mode).toBe('Simulator');
    expect(result.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════
// ⑤ getWhatsAppStatus
// ════════════════════════════════════════════════════════════
describe('getWhatsAppStatus', () => {
  it('returns the current global state', () => {
    global.__waInitialising = true; // prevent initWhatsAppClient from firing
    global.__waState = { status: 'qr', qrDataUrl: 'data:image/png;base64,mock' };
    const state = getWhatsAppStatus();
    expect(state.status).toBe('qr');
    expect(state.qrDataUrl).toBe('data:image/png;base64,mock');
  });

  it('returns disconnected when no client exists', () => {
    global.__waInitialising = true; // prevent initWhatsAppClient from firing
    global.__waState = { status: 'disconnected' };
    global.__waClient = undefined;
    const state = getWhatsAppStatus();
    expect(state.status).toBe('disconnected');
  });
});

// ════════════════════════════════════════════════════════════
// ⑥ logoutWhatsApp
// ════════════════════════════════════════════════════════════
describe('logoutWhatsApp', () => {
  it('calls logout and destroy on the client then clears state', async () => {
    const mockLogout = jest.fn().mockResolvedValue(undefined);
    const mockDestroy = jest.fn().mockResolvedValue(undefined);
    global.__waClient = { logout: mockLogout, destroy: mockDestroy, sendMessage: jest.fn() };
    global.__waState = { status: 'ready' };

    await logoutWhatsApp();

    expect(mockLogout).toHaveBeenCalled();
    expect(mockDestroy).toHaveBeenCalled();
    expect(global.__waClient).toBeUndefined();
    expect(global.__waState.status).toBe('disconnected');
  });

  it('does not throw if no client exists', async () => {
    global.__waClient = undefined;
    await expect(logoutWhatsApp()).resolves.toBeUndefined();
  });
});
