/**
 * ============================================================
 * WHITE-BOX UNIT TESTS — src/app/api/schools/route.ts
 * ============================================================
 */

import { GET, POST, PUT, DELETE } from '@/app/api/schools/route';
import * as db from '@/lib/db';
import * as auth from '@/lib/authConfig';

// Mock the DB and AuthConfig layers
jest.mock('@/lib/db', () => ({
  readTable: jest.fn(),
  writeTable: jest.fn(),
}));
jest.mock('@/lib/authConfig', () => ({
  getSession: jest.fn(),
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockAuth = auth as jest.Mocked<typeof auth>;

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/schools?${new URLSearchParams(params).toString()}`);
  return { url: url.toString() } as any;
}

function makeBodyRequest(body: Record<string, any>) {
  return {
    json: async () => body,
  } as any;
}

const SEED_SCHOOLS = [
  { schoolId: 'school-1', schoolName: 'School One', principalEmail: 'principal1@school.edu', status: 'active' },
  { schoolId: 'school-2', schoolName: 'School Two', principalEmail: 'principal2@school.edu', status: 'active' },
];

const SEED_USERS = [
  { email: 'superadmin@aura.edu', role: 'superadmin' },
  { email: 'principal1@school.edu', role: 'admin', schoolId: 'school-1' },
  { email: 'principal2@school.edu', role: 'admin', schoolId: 'school-2' },
  { email: 'teacher1@school.edu', role: 'teacher', schoolId: 'school-1' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.getSession.mockResolvedValue({
    email: 'superadmin@aura.edu',
    name: 'Platform Super Admin',
    role: 'superadmin',
    expires: Date.now() + 60000,
  });
  mockDb.writeTable.mockResolvedValue(undefined);
});

describe('GET /api/schools', () => {
  it('returns status 200 with schools list for superadmin', async () => {
    mockDb.readTable.mockResolvedValueOnce(SEED_SCHOOLS as any);
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual(SEED_SCHOOLS);
  });

  it('returns 403 if user is not a superadmin', async () => {
    mockAuth.getSession.mockResolvedValueOnce({
      email: 'principal1@school.edu',
      name: 'Principal',
      role: 'admin',
      expires: Date.now() + 60000,
    });
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe('POST /api/schools', () => {
  it('creates new school and principal user', async () => {
    mockDb.readTable
      .mockResolvedValueOnce([] as any) // users
      .mockResolvedValueOnce([] as any); // schools

    const req = makeBodyRequest({
      schoolName: 'New Academy',
      principalName: 'John Doe',
      principalEmail: 'john@new.edu',
      password: 'password123',
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.school.schoolName).toBe('New Academy');
    expect(mockDb.writeTable).toHaveBeenCalledTimes(2);
  });
});

describe('PUT /api/schools', () => {
  it('updates school license limit and returns success', async () => {
    mockDb.readTable.mockResolvedValueOnce(SEED_SCHOOLS as any);
    const req = makeBodyRequest({
      schoolId: 'school-1',
      licenseLimitClasses: 50,
    });
    const res = await PUT(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.school.licenseLimitClasses).toBe(50);
  });
});

describe('DELETE /api/schools', () => {
  it('returns 400 when schoolId is missing', async () => {
    const req = makeGetRequest({});
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/schoolId/i);
  });

  it('returns 404 when school is not found', async () => {
    mockDb.readTable.mockResolvedValueOnce(SEED_SCHOOLS as any);
    const req = makeGetRequest({ schoolId: 'school-nonexistent' });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('deletes school and cascades deletion across tables', async () => {
    mockDb.readTable
      .mockResolvedValueOnce(SEED_SCHOOLS as any) // schools
      .mockResolvedValueOnce(SEED_USERS as any) // users
      .mockResolvedValueOnce([] as any) // classes
      .mockResolvedValueOnce([] as any) // students
      .mockResolvedValueOnce([] as any) // attendance
      .mockResolvedValueOnce([] as any); // notifications

    const req = makeGetRequest({ schoolId: 'school-1' });
    const res = await DELETE(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify cascading writes
    expect(mockDb.writeTable).toHaveBeenCalledTimes(6);

    // Verify school-1 was filtered out of schools
    const schoolsWrite = mockDb.writeTable.mock.calls.find(c => c[0] === 'schools')?.[1] as any[];
    expect(schoolsWrite.find(s => s.schoolId === 'school-1')).toBeUndefined();

    // Verify principal1 and teacher1 were filtered out of users
    const usersWrite = mockDb.writeTable.mock.calls.find(c => c[0] === 'users')?.[1] as any[];
    expect(usersWrite.find(u => u.schoolId === 'school-1')).toBeUndefined();
    expect(usersWrite.find(u => u.email === 'principal1@school.edu')).toBeUndefined();
  });
});
