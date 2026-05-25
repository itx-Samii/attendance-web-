/**
 * ============================================================
 * WHITE-BOX UNIT TESTS — Route-level logic for API routes
 * (src/app/api/classes/route.ts)
 * ============================================================
 * Tests the internal business-rule paths of each HTTP handler:
 *   GET  — returns all classes
 *   POST — validates fields, rejects duplicates, creates class
 *   PUT  — validates fields, 404 for missing class, updates name
 *   DELETE — removes class + cascade-deletes its students
 * ============================================================
 */

import { GET, POST, PUT, DELETE } from '@/app/api/classes/route';
import * as db from '@/lib/db';

// ──────────────────────────────────────────────
// Mock the DB layer
// ──────────────────────────────────────────────
jest.mock('@/lib/db', () => ({
  readTable: jest.fn(),
  writeTable: jest.fn(),
  initDatabase: jest.fn(),
}));

const mockDb = db as jest.Mocked<typeof db>;

// ──────────────────────────────────────────────
// Helpers: build minimal NextRequest objects
// ──────────────────────────────────────────────
function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/classes?${new URLSearchParams(params).toString()}`);
  return { url: url.toString() } as any;
}

function makeBodyRequest(method: string, body: Record<string, any>) {
  const url = `http://localhost/api/classes`;
  return {
    url,
    json: async () => body,
  } as any;
}

function makeDeleteRequest(params: Record<string, string>) {
  const url = new URL(`http://localhost/api/classes?${new URLSearchParams(params).toString()}`);
  return { url: url.toString(), json: async () => ({}) } as any;
}

const SEED_CLASSES = [
  { classId: '9a', name: 'Grade 9 - Section A' },
  { classId: '9b', name: 'Grade 9 - Section B' },
];
const SEED_STUDENTS = [
  { rollNumber: '9A-01', name: 'Alice', parentPhone: '+1', classId: '9a' },
  { rollNumber: '9B-01', name: 'Bob',   parentPhone: '+2', classId: '9b' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.initDatabase.mockResolvedValue(undefined);
  mockDb.writeTable.mockResolvedValue(undefined);
});

// ════════════════════════════════════════════════════════════
// ① GET /api/classes
// ════════════════════════════════════════════════════════════
describe('GET /api/classes', () => {
  it('returns the full list of classes with status 200', async () => {
    mockDb.readTable.mockResolvedValueOnce(SEED_CLASSES as any);
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual(SEED_CLASSES);
  });

  it('returns empty array when no classes exist', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    const res = await GET();
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('returns 500 when DB read throws', async () => {
    mockDb.readTable.mockRejectedValueOnce(new Error('IO error'));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('IO error');
  });
});

// ════════════════════════════════════════════════════════════
// ② POST /api/classes
// ════════════════════════════════════════════════════════════
describe('POST /api/classes', () => {
  it('creates a new class and returns 200 with the created classroom', async () => {
    mockDb.readTable.mockResolvedValueOnce(SEED_CLASSES as any);
    const req = makeBodyRequest('POST', { classId: '11a', name: 'Grade 11A' });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.classroom.classId).toBe('11a');
  });

  it('rejects with 400 when classId is missing', async () => {
    const req = makeBodyRequest('POST', { name: 'Missing ID class' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/classId/i);
  });

  it('rejects with 400 when name is missing', async () => {
    const req = makeBodyRequest('POST', { classId: '11a' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects with 400 on duplicate classId (case-insensitive)', async () => {
    mockDb.readTable.mockResolvedValueOnce(SEED_CLASSES as any);
    const req = makeBodyRequest('POST', { classId: '9A', name: 'Duplicate' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it('normalises classId to lowercase before saving', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    const req = makeBodyRequest('POST', { classId: 'UPPER', name: 'Upper Case Class' });
    const res = await POST(req);
    const json = await res.json();
    expect(json.classroom.classId).toBe('upper');
  });

  it('trims whitespace from name before saving', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    const req = makeBodyRequest('POST', { classId: 'trim', name: '  Padded Name  ' });
    const res = await POST(req);
    const json = await res.json();
    expect(json.classroom.name).toBe('Padded Name');
  });
});

// ════════════════════════════════════════════════════════════
// ③ PUT /api/classes
// ════════════════════════════════════════════════════════════
describe('PUT /api/classes', () => {
  it('updates the class name and returns the updated classroom', async () => {
    mockDb.readTable.mockResolvedValueOnce([...SEED_CLASSES] as any);
    const req = makeBodyRequest('PUT', { classId: '9a', name: 'Grade 9 – Alpha Section' });
    const res = await PUT(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.classroom.name).toBe('Grade 9 – Alpha Section');
  });

  it('returns 404 when classId does not exist', async () => {
    mockDb.readTable.mockResolvedValueOnce(SEED_CLASSES as any);
    const req = makeBodyRequest('PUT', { classId: 'nonexistent', name: 'X' });
    const res = await PUT(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 when classId is not provided in body', async () => {
    const req = makeBodyRequest('PUT', { name: 'No ID' });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is not provided in body', async () => {
    const req = makeBodyRequest('PUT', { classId: '9a' });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it('preserves original classId — does not allow renaming the ID', async () => {
    mockDb.readTable.mockResolvedValueOnce([...SEED_CLASSES] as any);
    const req = makeBodyRequest('PUT', { classId: '9a', name: 'Updated' });
    const res = await PUT(req);
    const json = await res.json();
    expect(json.classroom.classId).toBe('9a');
  });
});

// ════════════════════════════════════════════════════════════
// ④ DELETE /api/classes
// ════════════════════════════════════════════════════════════
describe('DELETE /api/classes', () => {
  it('deletes an existing class and returns success:true', async () => {
    mockDb.readTable
      .mockResolvedValueOnce(SEED_CLASSES as any)   // classes read
      .mockResolvedValueOnce(SEED_STUDENTS as any);  // students read (cascade)
    const req = makeDeleteRequest({ classId: '9a' });
    const res = await DELETE(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('cascade-deletes students belonging to the deleted class', async () => {
    mockDb.readTable
      .mockResolvedValueOnce(SEED_CLASSES as any)
      .mockResolvedValueOnce(SEED_STUDENTS as any);
    const req = makeDeleteRequest({ classId: '9a' });
    await DELETE(req);

    // Second writeTable call should only contain 9b students
    const [, studentsWriteCall] = mockDb.writeTable.mock.calls;
    const savedStudents = studentsWriteCall[1] as any[];
    expect(savedStudents.every((s: any) => s.classId !== '9a')).toBe(true);
  });

  it('returns 400 when classId query param is missing', async () => {
    const req = makeDeleteRequest({});
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when class does not exist', async () => {
    mockDb.readTable.mockResolvedValueOnce(SEED_CLASSES as any);
    const req = makeDeleteRequest({ classId: 'notexist' });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('is case-insensitive for classId in DELETE', async () => {
    mockDb.readTable
      .mockResolvedValueOnce(SEED_CLASSES as any)
      .mockResolvedValueOnce(SEED_STUDENTS as any);
    const req = makeDeleteRequest({ classId: '9A' }); // uppercase
    const res = await DELETE(req);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
