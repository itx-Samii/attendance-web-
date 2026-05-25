/**
 * ============================================================
 * WHITE-BOX UNIT TESTS — src/app/api/attendance/route.ts
 * ============================================================
 * Tests internal paths of:
 *   GET  — filter by classId + optional date; missing classId
 *   POST — upsert logic (insert vs overwrite), payload validation
 * ============================================================
 */

import { GET, POST } from '@/app/api/attendance/route';
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
function makeGet(params: Record<string, string>) {
  const url = new URL(`http://localhost/api/attendance?${new URLSearchParams(params).toString()}`);
  return { url: url.toString() } as any;
}
function makePost(body: Record<string, any>) {
  return { url: 'http://localhost/api/attendance', json: async () => body } as any;
}

// ──────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────
const RECORDS = [
  { rollNumber: '9A-01', status: 'Present' as const },
  { rollNumber: '9A-02', status: 'Absent' as const },
];
const ATTENDANCE = [
  { classId: '9a', date: '2026-05-20', records: RECORDS },
  { classId: '9a', date: '2026-05-21', records: [{ rollNumber: '9A-01', status: 'Present' as const }] },
  { classId: '9b', date: '2026-05-20', records: [{ rollNumber: '9B-01', status: 'Late' as const }] },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.initDatabase.mockResolvedValue(undefined);
  mockDb.writeTable.mockResolvedValue(undefined);
});

// ════════════════════════════════════════════════════════════
// ① GET /api/attendance
// ════════════════════════════════════════════════════════════
describe('GET /api/attendance', () => {
  it('returns 400 when classId is missing', async () => {
    const res = await GET(makeGet({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/classId/i);
  });

  it('returns all attendance records for a class when date is not specified', async () => {
    mockDb.readTable.mockResolvedValueOnce(ATTENDANCE as any);
    const res = await GET(makeGet({ classId: '9a' }));
    const json = await res.json();
    expect(json).toHaveLength(2); // 2 days for class 9a
    expect(json.every((r: any) => r.classId === '9a')).toBe(true);
  });

  it('returns the specific day records when date is provided', async () => {
    mockDb.readTable.mockResolvedValueOnce(ATTENDANCE as any);
    const res = await GET(makeGet({ classId: '9a', date: '2026-05-20' }));
    const json = await res.json();
    // Returns the records array (not the outer wrapper)
    expect(json).toEqual(RECORDS);
  });

  it('returns empty array [] when no attendance exists for the specified date', async () => {
    mockDb.readTable.mockResolvedValueOnce(ATTENDANCE as any);
    const res = await GET(makeGet({ classId: '9a', date: '2000-01-01' }));
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('is case-insensitive for classId', async () => {
    mockDb.readTable.mockResolvedValueOnce(ATTENDANCE as any);
    const res = await GET(makeGet({ classId: '9A' }));
    const json = await res.json();
    expect(json).toHaveLength(2);
  });

  it('returns 500 when DB read throws', async () => {
    mockDb.readTable.mockRejectedValueOnce(new Error('IO fail'));
    const res = await GET(makeGet({ classId: '9a' }));
    expect(res.status).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════
// ② POST /api/attendance — upsert
// ════════════════════════════════════════════════════════════
describe('POST /api/attendance', () => {
  it('inserts a new attendance record when none exists for this class+date', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    const body = { classId: '9a', date: '2026-05-25', records: RECORDS };
    const res = await POST(makePost(body));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const saved = mockDb.writeTable.mock.calls[0][1] as any[];
    expect(saved).toHaveLength(1);
    expect(saved[0].date).toBe('2026-05-25');
  });

  it('overwrites an existing record for the same class+date (upsert)', async () => {
    const existing = [{ classId: '9a', date: '2026-05-20', records: RECORDS }];
    mockDb.readTable.mockResolvedValueOnce(existing as any);

    const newRecords = [{ rollNumber: '9A-01', status: 'Late' as const }];
    const body = { classId: '9a', date: '2026-05-20', records: newRecords };
    const res = await POST(makePost(body));
    expect(res.status).toBe(200);

    const saved = mockDb.writeTable.mock.calls[0][1] as any[];
    expect(saved).toHaveLength(1); // still only 1 record (overwritten)
    expect(saved[0].records[0].status).toBe('Late');
  });

  it('returns 400 when classId is missing', async () => {
    const res = await POST(makePost({ date: '2026-05-25', records: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when date is missing', async () => {
    const res = await POST(makePost({ classId: '9a', records: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when records is not an array', async () => {
    const res = await POST(makePost({ classId: '9a', date: '2026-05-25', records: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('stores remarks as empty string when not provided in record', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    const body = {
      classId: '9a',
      date: '2026-05-25',
      records: [{ rollNumber: '9A-01', status: 'Present' }], // no remarks
    };
    await POST(makePost(body));
    const saved = mockDb.writeTable.mock.calls[0][1] as any[];
    expect(saved[0].records[0].remarks).toBe('');
  });

  it('preserves other class/date records when upserting (does not wipe the table)', async () => {
    mockDb.readTable.mockResolvedValueOnce(ATTENDANCE as any);
    const body = { classId: '9a', date: '2026-05-25', records: RECORDS };
    await POST(makePost(body));
    const saved = mockDb.writeTable.mock.calls[0][1] as any[];
    // Original 9b record should still be present
    expect(saved.some((r: any) => r.classId === '9b')).toBe(true);
  });
});
