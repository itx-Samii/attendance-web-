/**
 * ============================================================
 * WHITE-BOX UNIT TESTS — src/app/api/students/route.ts
 * ============================================================
 * Tests internal paths:
 *   GET    — filter by classId (case-insensitive)
 *   POST   — field validation, duplicate rollNumber, unknown classId
 *   PUT    — partial update (name/phone/class individually)
 *   DELETE — removes a student by rollNumber
 * ============================================================
 */

import { GET, POST, PUT, DELETE } from '@/app/api/students/route';
import * as db from '@/lib/db';

jest.mock('@/lib/db', () => ({
  readTable: jest.fn(),
  writeTable: jest.fn(),
  initDatabase: jest.fn(),
}));

const mockDb = db as jest.Mocked<typeof db>;

// ──────────────────────────────────────────────
// Request Builders
// ──────────────────────────────────────────────
function makeGet(params: Record<string, string> = {}) {
  const url = new URL(`http://localhost/api/students?${new URLSearchParams(params).toString()}`);
  return { url: url.toString() } as any;
}
function makeBody(body: Record<string, any>) {
  return { url: 'http://localhost/api/students', json: async () => body } as any;
}
function makeDel(params: Record<string, string>) {
  const url = new URL(`http://localhost/api/students?${new URLSearchParams(params).toString()}`);
  return { url: url.toString(), json: async () => ({}) } as any;
}

// ──────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────
const CLASSES = [
  { classId: '9a', name: 'Grade 9A' },
  { classId: '9b', name: 'Grade 9B' },
];
const STUDENTS = [
  { rollNumber: '9A-01', name: 'Alice', parentPhone: '+15551', classId: '9a' },
  { rollNumber: '9A-02', name: 'Bob',   parentPhone: '+15552', classId: '9a' },
  { rollNumber: '9B-01', name: 'Carol', parentPhone: '+15553', classId: '9b' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.initDatabase.mockResolvedValue(undefined);
  mockDb.writeTable.mockResolvedValue(undefined);
});

// ════════════════════════════════════════════════════════════
// ① GET /api/students
// ════════════════════════════════════════════════════════════
describe('GET /api/students', () => {
  it('returns only students for the given classId', async () => {
    mockDb.readTable.mockResolvedValueOnce(STUDENTS as any);
    const res = await GET(makeGet({ classId: '9a' }));
    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json.every((s: any) => s.classId === '9a')).toBe(true);
  });

  it('is case-insensitive for classId filter', async () => {
    mockDb.readTable.mockResolvedValueOnce(STUDENTS as any);
    const res = await GET(makeGet({ classId: '9A' }));
    const json = await res.json();
    expect(json).toHaveLength(2);
  });

  it('returns 400 when classId query param is missing', async () => {
    const res = await GET(makeGet({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/classId/i);
  });

  it('returns empty array for a class with no students', async () => {
    mockDb.readTable.mockResolvedValueOnce(STUDENTS as any);
    const res = await GET(makeGet({ classId: '10a' }));
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════
// ② POST /api/students
// ════════════════════════════════════════════════════════════
describe('POST /api/students', () => {
  it('creates a new student successfully', async () => {
    mockDb.readTable
      .mockResolvedValueOnce(STUDENTS as any) // check duplicate
      .mockResolvedValueOnce(CLASSES as any); // check class exists
    const body = { rollNumber: '9A-03', name: 'Dave', parentPhone: '+15554', classId: '9a' };
    const res = await POST(makeBody(body));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.student.rollNumber).toBe('9A-03');
  });

  it('returns 400 if rollNumber is missing', async () => {
    const res = await POST(makeBody({ name: 'Dave', parentPhone: '+1', classId: '9a' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if name is missing', async () => {
    const res = await POST(makeBody({ rollNumber: 'X', parentPhone: '+1', classId: '9a' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if parentPhone is missing', async () => {
    const res = await POST(makeBody({ rollNumber: 'X', name: 'Y', classId: '9a' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 if classId is missing', async () => {
    const res = await POST(makeBody({ rollNumber: 'X', name: 'Y', parentPhone: '+1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on duplicate rollNumber (case-insensitive)', async () => {
    mockDb.readTable.mockResolvedValueOnce(STUDENTS as any);
    const res = await POST(makeBody({ rollNumber: '9a-01', name: 'X', parentPhone: '+1', classId: '9a' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it('returns 400 when the referenced classId does not exist', async () => {
    mockDb.readTable
      .mockResolvedValueOnce(STUDENTS as any) // no duplicate
      .mockResolvedValueOnce(CLASSES as any); // class list
    const res = await POST(makeBody({ rollNumber: 'XX-01', name: 'X', parentPhone: '+1', classId: '99z' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/does not exist/i);
  });

  it('normalises classId to lowercase before saving', async () => {
    mockDb.readTable
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce(CLASSES as any);
    const res = await POST(makeBody({ rollNumber: 'NEW-01', name: 'X', parentPhone: '+1', classId: '9A' }));
    const json = await res.json();
    expect(json.student.classId).toBe('9a');
  });
});

// ════════════════════════════════════════════════════════════
// ③ PUT /api/students
// ════════════════════════════════════════════════════════════
describe('PUT /api/students', () => {
  it('updates student name when provided', async () => {
    mockDb.readTable.mockResolvedValueOnce([...STUDENTS] as any);
    const res = await PUT(makeBody({ rollNumber: '9A-01', name: 'Alexandra' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.student.name).toBe('Alexandra');
  });

  it('updates student parentPhone when provided', async () => {
    mockDb.readTable.mockResolvedValueOnce([...STUDENTS] as any);
    const res = await PUT(makeBody({ rollNumber: '9A-01', parentPhone: '+999' }));
    const json = await res.json();
    expect(json.student.parentPhone).toBe('+999');
  });

  it('updates student classId when provided', async () => {
    mockDb.readTable
      .mockResolvedValueOnce([...STUDENTS] as any)
      .mockResolvedValueOnce(CLASSES as any);
    const res = await PUT(makeBody({ rollNumber: '9A-01', classId: '9B' }));
    const json = await res.json();
    expect(json.student.classId).toBe('9b');
  });

  it('returns 400 when rollNumber is missing from body', async () => {
    const res = await PUT(makeBody({ name: 'No Roll' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when rollNumber does not exist', async () => {
    mockDb.readTable.mockResolvedValueOnce(STUDENTS as any);
    const res = await PUT(makeBody({ rollNumber: 'GHOST-01', name: 'Ghost' }));
    expect(res.status).toBe(404);
  });

  it('is case-insensitive for rollNumber lookup', async () => {
    mockDb.readTable.mockResolvedValueOnce([...STUDENTS] as any);
    const res = await PUT(makeBody({ rollNumber: '9a-01', name: 'Lower' }));
    const json = await res.json();
    expect(json.student.name).toBe('Lower');
  });
});

// ════════════════════════════════════════════════════════════
// ④ DELETE /api/students
// ════════════════════════════════════════════════════════════
describe('DELETE /api/students', () => {
  it('deletes an existing student and returns success:true', async () => {
    mockDb.readTable.mockResolvedValueOnce([...STUDENTS] as any);
    const res = await DELETE(makeDel({ rollNumber: '9A-01' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('removes only the target student from the written array', async () => {
    mockDb.readTable.mockResolvedValueOnce([...STUDENTS] as any);
    await DELETE(makeDel({ rollNumber: '9A-01' }));
    const writtenStudents = mockDb.writeTable.mock.calls[0][1] as any[];
    expect(writtenStudents.some((s: any) => s.rollNumber === '9A-01')).toBe(false);
    expect(writtenStudents).toHaveLength(STUDENTS.length - 1);
  });

  it('returns 400 when rollNumber query param is missing', async () => {
    const res = await DELETE(makeDel({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 when rollNumber does not exist', async () => {
    mockDb.readTable.mockResolvedValueOnce(STUDENTS as any);
    const res = await DELETE(makeDel({ rollNumber: 'GHOST-99' }));
    expect(res.status).toBe(404);
  });

  it('is case-insensitive for rollNumber in DELETE', async () => {
    mockDb.readTable.mockResolvedValueOnce([...STUDENTS] as any);
    const res = await DELETE(makeDel({ rollNumber: '9A-01'.toLowerCase() }));
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
