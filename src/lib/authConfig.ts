import crypto from 'crypto';

export const AUTH_CREDENTIALS = {
  email: 'teacher@aura.edu',
  password: 'Aura123!',
  name: 'Professor Aura',
  role: 'teacher'
};

// Secret key for symmetric encryption (fallback if env var not configured)
const SECRET = process.env.SESSION_SECRET || 'aura-attendance-erp-super-secret-key-32-chars';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET).digest(); // 32 bytes
const IV_LENGTH = 16; // For AES

export interface SessionData {
  email: string;
  name: string;
  role: string;
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
    console.warn('Session decryption failed:', error.message);
    return null;
  }
}
