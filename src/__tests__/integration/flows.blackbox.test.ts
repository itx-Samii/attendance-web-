/**
 * ============================================================
 * BLACK-BOX INTEGRATION TESTS — Student Management Flows
 * ============================================================
 * Tests complete end-to-end scenarios from an external
 * user's perspective, verifying only observable HTTP outcomes
 * across multi-step workflows:
 *
 * Scenario 1: Full student lifecycle (create → read → update → delete)
 * Scenario 2: Referential integrity (cannot add student to non-existent class)
 * Scenario 3: Duplicate prevention
 * Scenario 4: Cascade delete (class deleted → students removed)
 * Scenario 5: Attendance upsert cycle (mark → update → verify)
 * ============================================================
 */

import { GET as getStudents, POST as postStudent, PUT as putStudent, DELETE as deleteStudent } from '@/app/api/students/route';
import { GET as getClasses, POST as postClass, DELETE as deleteClass } from '@/app/api/classes/route';
import { GET as getAttendance, POST as postAttendance } from '@/app/api/attendance/route';
import * as db from '@/lib/db';

jest.mock('@/lib/db', () => ({
  readTable: jest.fn(),
  writeTable: jest.fn(),
  initDatabase: jest.fn(),
}));

const mockDb = db as jest.Mocked<typeof db>;

// ──────────────────────────────────────────────
// In-memory store to simulate the JSON DB
// ──────────────────────────────────────────────
type Store = { [table: string]: any[] };

function createMemoryStore(initial: Store = {}) {
  const store: Store = { classes: [], students: [], attendance: [], ...initial };

  mockDb.readTable.mockImplementation(async (table: string) => {
    return [...(store[table] || [])];
  });
  mockDb.writeTable.mockImplementation(async (table: string, data: any[]) => {
    store[table] = [...data];
  });
  mockDb.initDatabase.mockResolvedValue(undefined);

  return store;
}

// ──────────────────────────────────────────────
// Request helpers
// ──────────────────────────────────────────────
const R = {
  get: (path: string, params?: Record<string, string>) => {
    const url = new URL(`http://localhost${path}${params ? '?' + new URLSearchParams(params).toString() : ''}`);
    return { url: url.toString() } as any;
  },
  post: (body: any) => ({ url: 'http://localhost', json: async () => body } as any),
  del: (params: Record<string, string>) => {
    const url = new URL(`http://localhost?${new URLSearchParams(params).toString()}`);
    return { url: url.toString(), json: async () => ({}) } as any;
  },
};

// ════════════════════════════════════════════════════════════
// Scenario 1: Full student lifecycle (Create → Read → Update → Delete)
// ════════════════════════════════════════════════════════════
describe('Scenario 1: Full student lifecycle', () => {
  let store: Store;

  beforeEach(() => {
    store = createMemoryStore({
      classes: [{ classId: '9a', name: 'Grade 9A' }],
    });
  });

  it('successfully creates, reads, updates, then deletes a student', async () => {
    // 1. CREATE
    const createRes = await postStudent(R.post({
      rollNumber: 'S-001', name: 'Emily Rose', parentPhone: '+15551001', classId: '9a',
    }));
    expect(createRes.status).toBe(200);
    expect((await createRes.json()).success).toBe(true);

    // 2. READ — should now appear in GET by classId
    const readRes = await getStudents(R.get('/api/students', { classId: '9a' }));
    const students = await readRes.json();
    expect(students).toHaveLength(1);
    expect(students[0].name).toBe('Emily Rose');

    // 3. UPDATE — change name and phone
    const updateRes = await putStudent(R.post({
      rollNumber: 'S-001', name: 'Emily R. Updated', parentPhone: '+15559999',
    }));
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()).student;
    expect(updated.name).toBe('Emily R. Updated');
    expect(updated.parentPhone).toBe('+15559999');

    // 4. DELETE — remove student
    const delRes = await deleteStudent(R.del({ rollNumber: 'S-001' }));
    expect(delRes.status).toBe(200);

    // 5. VERIFY — should no longer exist
    const afterDelete = await getStudents(R.get('/api/students', { classId: '9a' }));
    const afterStudents = await afterDelete.json();
    expect(afterStudents).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════
// Scenario 2: Referential integrity — student requires existing class
// ════════════════════════════════════════════════════════════
describe('Scenario 2: Referential integrity', () => {
  beforeEach(() => {
    createMemoryStore({
      classes: [{ classId: '9a', name: 'Grade 9A' }],
    });
  });

  it('rejects creating a student for a non-existent class with 400', async () => {
    const res = await postStudent(R.post({
      rollNumber: 'S-999', name: 'Ghost', parentPhone: '+1', classId: 'nonexistent',
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/does not exist/i);
  });

  it('allows creating a student after their class is created', async () => {
    // Create the class first
    await postClass(R.post({ classId: '12a', name: 'Grade 12A' }));

    // Now create the student
    const res = await postStudent(R.post({
      rollNumber: '12A-01', name: 'New Student', parentPhone: '+1', classId: '12a',
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════
// Scenario 3: Duplicate prevention
// ════════════════════════════════════════════════════════════
describe('Scenario 3: Duplicate prevention', () => {
  beforeEach(() => {
    createMemoryStore({
      classes: [{ classId: '9a', name: 'Grade 9A' }],
    });
  });

  it('prevents creating two students with the same roll number', async () => {
    // First creation succeeds
    const first = await postStudent(R.post({
      rollNumber: 'DUP-01', name: 'First Student', parentPhone: '+1', classId: '9a',
    }));
    expect(first.status).toBe(200);

    // Second creation with same rollNumber fails
    const second = await postStudent(R.post({
      rollNumber: 'DUP-01', name: 'Second Student', parentPhone: '+2', classId: '9a',
    }));
    expect(second.status).toBe(400);
    expect((await second.json()).error).toMatch(/already exists/i);
  });

  it('prevents creating two classes with the same classId', async () => {
    const second = await postClass(R.post({ classId: '9a', name: 'Duplicate Grade 9A' }));
    expect(second.status).toBe(400);
    expect((await second.json()).error).toMatch(/already exists/i);
  });
});

// ════════════════════════════════════════════════════════════
// Scenario 4: Cascade delete — deleting a class removes its students
// ════════════════════════════════════════════════════════════
describe('Scenario 4: Class deletion cascades to students', () => {
  let store: Store;

  beforeEach(() => {
    store = createMemoryStore({
      classes: [
        { classId: '9a', name: 'Grade 9A' },
        { classId: '9b', name: 'Grade 9B' },
      ],
      students: [
        { rollNumber: '9A-01', name: 'Alice', parentPhone: '+1', classId: '9a' },
        { rollNumber: '9A-02', name: 'Bob',   parentPhone: '+2', classId: '9a' },
        { rollNumber: '9B-01', name: 'Carol', parentPhone: '+3', classId: '9b' },
      ],
    });
  });

  it('deletes class and removes all associated students', async () => {
    const delRes = await deleteClass(R.del({ classId: '9a' }));
    expect(delRes.status).toBe(200);

    // 9A students should be gone
    const studentsRes = await getStudents(R.get('/api/students', { classId: '9a' }));
    expect(await studentsRes.json()).toHaveLength(0);
  });

  it('preserves students from other classes after cascade delete', async () => {
    await deleteClass(R.del({ classId: '9a' }));

    // 9B students should still exist
    const studentsRes = await getStudents(R.get('/api/students', { classId: '9b' }));
    const remaining = await studentsRes.json();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].rollNumber).toBe('9B-01');
  });
});

// ════════════════════════════════════════════════════════════
// Scenario 5: Attendance upsert cycle (mark → re-mark → verify)
// ════════════════════════════════════════════════════════════
describe('Scenario 5: Attendance upsert lifecycle', () => {
  beforeEach(() => {
    createMemoryStore({ attendance: [] });
  });

  it('inserts a new attendance record and retrieves it correctly', async () => {
    const records = [
      { rollNumber: '9A-01', status: 'Present' },
      { rollNumber: '9A-02', status: 'Absent' },
    ];
    const postRes = await postAttendance(R.post({ classId: '9a', date: '2026-05-25', records }));
    expect(postRes.status).toBe(200);

    const getRes = await getAttendance(R.get('/api/attendance', { classId: '9a', date: '2026-05-25' }));
    const fetched = await getRes.json();
    expect(fetched).toHaveLength(2);
    expect(fetched.find((r: any) => r.rollNumber === '9A-02').status).toBe('Absent');
  });

  it('overwrites (upserts) attendance for the same class+date', async () => {
    // First mark
    await postAttendance(R.post({ classId: '9a', date: '2026-05-25', records: [{ rollNumber: '9A-01', status: 'Present' }] }));

    // Second mark (overwrite)
    await postAttendance(R.post({ classId: '9a', date: '2026-05-25', records: [{ rollNumber: '9A-01', status: 'Late' }] }));

    // Verify updated status
    const getRes = await getAttendance(R.get('/api/attendance', { classId: '9a', date: '2026-05-25' }));
    const fetched = await getRes.json();
    expect(fetched[0].status).toBe('Late');
  });

  it('returns all date records when no date filter is applied', async () => {
    await postAttendance(R.post({ classId: '9a', date: '2026-05-20', records: [{ rollNumber: '9A-01', status: 'Present' }] }));
    await postAttendance(R.post({ classId: '9a', date: '2026-05-21', records: [{ rollNumber: '9A-01', status: 'Absent' }] }));

    const getRes = await getAttendance(R.get('/api/attendance', { classId: '9a' }));
    const allDays = await getRes.json();
    expect(allDays).toHaveLength(2);
  });
});
