import crypto from 'crypto';
import { readTable, writeTable } from './db';
import { cookies } from 'next/headers';

export interface StaffUser {
  email: string;
  password?: string;
  name: string;
  role: 'superadmin' | 'admin' | 'teacher';
  classId?: string;
  schoolId?: string;
}

export const AUTH_CREDENTIALS = {
  email: 'teacher@aura.edu',
  password: 'Teacher123!',
  name: 'Professor Aura',
  role: 'teacher' as const,
  classId: '9a',
  schoolId: 'school-aura'
};

export async function initUsers(): Promise<void> {
  try {
    const { initDatabase } = await import('./db');
    await initDatabase();
  } catch (err) {
    console.error('Failed to run initDatabase in initUsers:', err);
  }
  try {
    const users = await readTable<StaffUser>('users');
    if (users.length === 0) {
      const defaultUsers: StaffUser[] = [
        {
          email: 'superadmin@aura.edu',
          password: 'SuperAdmin123!',
          name: 'Platform Super Admin',
          role: 'superadmin',
        },
        {
          email: 'admin@aura.edu',
          password: 'Admin123!',
          name: 'Principal Aura',
          role: 'admin',
          schoolId: 'school-aura',
        },
        {
          email: 'teacher@aura.edu',
          password: 'Teacher123!',
          name: 'Professor Aura',
          role: 'teacher',
          classId: '9a',
          schoolId: 'school-aura',
        },
      ];
      await writeTable('users', defaultUsers);
    }
  } catch (err) {
    console.error('Failed to initialize users table:', err);
  }
}

export async function findUserByEmail(email: string): Promise<StaffUser | null> {
  await initUsers();
  try {
    const users = await readTable<StaffUser>('users');
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return found || null;
  } catch {
    return null;
  }
}

// Secret key for symmetric encryption (fallback if env var not configured)
const SECRET = process.env.SESSION_SECRET || 'aura-attendance-erp-super-secret-key-32-chars';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET).digest(); // 32 bytes
const IV_LENGTH = 16; // For AES

export interface SessionData {
  email: string;
  name: string;
  role: string;
  classId?: string;
  schoolId?: string;
  expires: number;
}

/**
 * Encrypts session data into a secure URL-friendly token.
 */
export function encryptSession(data: SessionData): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Format: iv_hex:encrypted_hex
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Session encryption failed:', error);
    throw new Error('Could not create secure session.');
  }
}

/**
 * Decrypts token back into session data. Returns null if invalid or expired.
 */
export function decryptSession(token: string): SessionData | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    const session = JSON.parse(decrypted) as SessionData;
    
    // Check if session has expired
    if (Date.now() > session.expires) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.warn('Session decryption failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Shared utility to cleanly fetch current decrypted user session in API endpoints.
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('aura_session');
    if (!sessionCookie || !sessionCookie.value) return null;
    return decryptSession(sessionCookie.value);
  } catch {
    return null;
  }
}
