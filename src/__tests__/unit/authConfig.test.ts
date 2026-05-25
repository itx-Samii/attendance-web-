/**
 * ============================================================
 * WHITE-BOX UNIT TESTS — src/lib/authConfig.ts
 * ============================================================
 * Tests internal implementation details:
 *   - encryptSession / decryptSession (AES-256-CBC internals)
 *   - Session expiry logic
 *   - Malformed / truncated token paths
 *   - findUserByEmail case-insensitive matching
 * ============================================================
 */

import { encryptSession, decryptSession, findUserByEmail, SessionData } from '@/lib/authConfig';
import * as db from '@/lib/db';

// ──────────────────────────────────────────────
// Mock the file-system DB layer so tests are
// fully hermetic (no real disk I/O)
// ──────────────────────────────────────────────
jest.mock('@/lib/db', () => ({
  readTable: jest.fn(),
  writeTable: jest.fn(),
}));

const mockReadTable = db.readTable as jest.MockedFunction<typeof db.readTable>;
const mockWriteTable = db.writeTable as jest.MockedFunction<typeof db.writeTable>;

// ──────────────────────────────────────────────
// Helper: build a valid session that expires
// in the future (or past)
// ──────────────────────────────────────────────
function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    email: 'test@aura.edu',
    name: 'Test User',
    role: 'teacher',
    classId: '9a',
    expires: Date.now() + 60_000, // 1 minute from now
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════
// ① encryptSession
// ════════════════════════════════════════════════════════════
describe('encryptSession', () => {
  it('returns a non-empty string token', () => {
    const token = encryptSession(makeSession());
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('produces tokens in iv_hex:ciphertext_hex format (exactly one colon separator)', () => {
    const token = encryptSession(makeSession());
    const parts = token.split(':');
    expect(parts).toHaveLength(2);
    // IV should be 32 hex chars (16 bytes)
    expect(parts[0]).toHaveLength(32);
    // Cipher text should be non-empty hex
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('produces different tokens on each call (random IV ensures uniqueness)', () => {
    const session = makeSession();
    const token1 = encryptSession(session);
    const token2 = encryptSession(session);
    expect(token1).not.toBe(token2);
  });

  it('correctly embeds all session fields so decryption restores them', () => {
    const session = makeSession({ email: 'admin@aura.edu', role: 'admin', classId: undefined });
    const token = encryptSession(session);
    const restored = decryptSession(token);
    expect(restored?.email).toBe(session.email);
    expect(restored?.role).toBe(session.role);
    expect(restored?.name).toBe(session.name);
  });
});

// ════════════════════════════════════════════════════════════
// ② decryptSession
// ════════════════════════════════════════════════════════════
describe('decryptSession', () => {
  it('round-trips a valid session correctly', () => {
    const session = makeSession();
    const token = encryptSession(session);
    const result = decryptSession(token);
    expect(result).not.toBeNull();
    expect(result!.email).toBe(session.email);
    expect(result!.name).toBe(session.name);
    expect(result!.role).toBe(session.role);
    expect(result!.classId).toBe(session.classId);
  });

  it('returns null for an expired session (expires in the past)', () => {
    const expired = makeSession({ expires: Date.now() - 1000 });
    const token = encryptSession(expired);
    const result = decryptSession(token);
    expect(result).toBeNull();
  });

  it('returns null when the token has no colon separator (malformed)', () => {
    const result = decryptSession('completelyinvalidtoken');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', () => {
    const result = decryptSession('');
    expect(result).toBeNull();
  });

  it('returns null for a token with tampered ciphertext', () => {
    const token = encryptSession(makeSession());
    const [iv] = token.split(':');
    // Replace ciphertext with random garbage
    const tampered = `${iv}:deadbeefdeadbeefdeadbeefdeadbeef`;
    const result = decryptSession(tampered);
    expect(result).toBeNull();
  });

  it('returns null for a token with truncated IV (less than 32 hex chars)', () => {
    const result = decryptSession('abcd:someciphertext');
    expect(result).toBeNull();
  });

  it('preserves the expires field accurately through round-trip', () => {
    const future = Date.now() + 3_600_000;
    const session = makeSession({ expires: future });
    const token = encryptSession(session);
    const result = decryptSession(token);
    // Allow a small drift for the ms when the test runs
    expect(result!.expires).toBe(future);
  });
});

// ════════════════════════════════════════════════════════════
// ③ findUserByEmail
// ════════════════════════════════════════════════════════════
describe('findUserByEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const seedUsers = [
    { email: 'admin@aura.edu', password: 'Admin123!', name: 'Principal Aura', role: 'admin' as const },
    { email: 'teacher@aura.edu', password: 'Teacher123!', name: 'Professor Aura', role: 'teacher' as const, classId: '9a' },
  ];

  it('finds a user by exact email match', async () => {
    mockReadTable.mockResolvedValue(seedUsers as any);
    const user = await findUserByEmail('admin@aura.edu');
    expect(user).not.toBeNull();
    expect(user!.name).toBe('Principal Aura');
  });

  it('finds a user with case-insensitive email comparison (UPPER input)', async () => {
    mockReadTable.mockResolvedValue(seedUsers as any);
    const user = await findUserByEmail('TEACHER@AURA.EDU');
    expect(user).not.toBeNull();
    expect(user!.role).toBe('teacher');
  });

  it('finds a user with mixed-case email', async () => {
    mockReadTable.mockResolvedValue(seedUsers as any);
    const user = await findUserByEmail('Admin@Aura.Edu');
    expect(user).not.toBeNull();
    expect(user!.role).toBe('admin');
  });

  it('returns null for an unregistered email', async () => {
    mockReadTable.mockResolvedValue(seedUsers as any);
    const user = await findUserByEmail('unknown@aura.edu');
    expect(user).toBeNull();
  });

  it('returns null when the user table is empty', async () => {
    // First call: users table empty → triggers writeTable seed
    // Second call: returns seeded data — simulate as empty to test the path
    mockReadTable.mockResolvedValue([] as any);
    mockWriteTable.mockResolvedValue(undefined);
    // Re-read after seed will also return empty in this mock
    mockReadTable.mockResolvedValueOnce([] as any).mockResolvedValueOnce([] as any);
    const user = await findUserByEmail('admin@aura.edu');
    expect(user).toBeNull();
  });

  it('returns null gracefully when readTable rejects', async () => {
    mockReadTable.mockRejectedValue(new Error('Disk I/O error'));
    const user = await findUserByEmail('admin@aura.edu');
    expect(user).toBeNull();
  });
});
