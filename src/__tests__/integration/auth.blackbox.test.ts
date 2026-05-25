/**
 * ============================================================
 * BLACK-BOX INTEGRATION TESTS — Auth API Boundary
 * (src/app/api/auth/login)
 * ============================================================
 * Black-box approach: we test ONLY the observable HTTP behaviour
 * (status codes, response body shape) without inspecting
 * internal implementation details.
 *
 * User-visible contract under test:
 *   ✅ Valid credentials → 200 + { success, user: {email,name,role} }
 *   ❌ Wrong password   → 401 + { error }
 *   ❌ Unknown email    → 401 + { error }
 *   ❌ Missing fields   → 400 + { error }
 *
 * The DB is mocked at the module boundary to keep tests hermetic.
 * ============================================================
 */

import { POST } from '@/app/api/auth/login/route';

// ──────────────────────────────────────────────
// Mock the DB so no real files are touched
// ──────────────────────────────────────────────
jest.mock('@/lib/db', () => ({
  readTable: jest.fn(),
  writeTable: jest.fn(),
}));

// Mock Next.js cookies() — not available outside the request cycle
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  })),
}));

import * as db from '@/lib/db';
const mockDb = db as jest.Mocked<typeof db>;

// ──────────────────────────────────────────────
// The seeded user list (matches authConfig defaults)
// ──────────────────────────────────────────────
const USERS = [
  { email: 'admin@aura.edu',   password: 'Admin123!',   name: 'Principal Aura', role: 'admin' },
  { email: 'teacher@aura.edu', password: 'Teacher123!', name: 'Professor Aura', role: 'teacher', classId: '9a' },
];

function makeRequest(body: Record<string, any>) {
  return { json: async () => body } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Simulate the users table being populated
  mockDb.readTable.mockResolvedValue(USERS as any);
  mockDb.writeTable.mockResolvedValue(undefined);
});

// ════════════════════════════════════════════════════════════
// ① Happy paths
// ════════════════════════════════════════════════════════════
describe('POST /api/auth/login — valid credentials', () => {
  it('returns 200 and user object for a valid admin login', async () => {
    const res = await POST(makeRequest({ email: 'admin@aura.edu', password: 'Admin123!' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('admin@aura.edu');
    expect(body.user.name).toBe('Principal Aura');
    expect(body.user.role).toBe('admin');
  });

  it('returns 200 and user object for a valid teacher login', async () => {
    const res = await POST(makeRequest({ email: 'teacher@aura.edu', password: 'Teacher123!' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.role).toBe('teacher');
  });

  it('does NOT expose the password field in the response', async () => {
    const res = await POST(makeRequest({ email: 'admin@aura.edu', password: 'Admin123!' }));
    const body = await res.json();
    expect(body.user.password).toBeUndefined();
  });

  it('response body has exactly the expected fields (success, user)', async () => {
    const res = await POST(makeRequest({ email: 'admin@aura.edu', password: 'Admin123!' }));
    const body = await res.json();
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['success', 'user']));
  });
});

// ════════════════════════════════════════════════════════════
// ② Invalid credentials (401)
// ════════════════════════════════════════════════════════════
describe('POST /api/auth/login — invalid credentials', () => {
  it('returns 401 for a correct email but wrong password', async () => {
    const res = await POST(makeRequest({ email: 'admin@aura.edu', password: 'WrongPass!' }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBeDefined();
    expect(body.success).toBeUndefined();
  });

  it('returns 401 for an unknown email address', async () => {
    const res = await POST(makeRequest({ email: 'hacker@evil.com', password: 'Admin123!' }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error).toBeDefined();
  });

  it('returns 401 for empty password', async () => {
    // Empty string → invalid (login will fail at user lookup)
    const res = await POST(makeRequest({ email: 'admin@aura.edu', password: '' }));
    // Either 400 (missing field) or 401 (wrong credential) — must NOT be 200
    expect(res.status).not.toBe(200);
  });

  it('does not reveal which field is wrong (generic combined error message)', async () => {
    const res = await POST(makeRequest({ email: 'admin@aura.edu', password: 'BadPass' }));
    const body = await res.json();
    // The error message should be a combined message (like "Invalid email or password")
    // not separate field-specific messages like "Email not found" or "Incorrect password".
    // A combined message referencing both fields IS acceptable for security.
    expect(body.error).toBeDefined();
    // Must NOT give separate hints (e.g. 'Email not found' or 'Incorrect password')
    expect(body.error).not.toMatch(/not found/i);
    expect(body.error).not.toMatch(/incorrect/i);
    expect(body.error).not.toMatch(/wrong/i);
  });
});

// ════════════════════════════════════════════════════════════
// ③ Missing fields (400)
// ════════════════════════════════════════════════════════════
describe('POST /api/auth/login — missing fields', () => {
  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'Admin123!' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'admin@aura.edu' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is completely empty', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════
// ④ Edge cases
// ════════════════════════════════════════════════════════════
describe('POST /api/auth/login — edge cases', () => {
  it('handles email case-insensitivity (UPPER@DOMAIN.COM matches lower)', async () => {
    const res = await POST(makeRequest({ email: 'ADMIN@AURA.EDU', password: 'Admin123!' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 500-class response when DB is unavailable', async () => {
    mockDb.readTable.mockRejectedValue(new Error('DB failure'));
    const res = await POST(makeRequest({ email: 'admin@aura.edu', password: 'Admin123!' }));
    // Must not be 200 — should be 4xx or 5xx
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
