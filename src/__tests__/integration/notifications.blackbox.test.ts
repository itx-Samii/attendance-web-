/**
 * ============================================================
 * BLACK-BOX INTEGRATION TESTS — Notifications API
 * (src/app/api/notifications/route.ts)
 * ============================================================
 * Tests the observable contract of the notification endpoints:
 *
 * GET  /api/notifications
 *   ✅ Returns an array of logs sorted newest-first
 *   ✅ Returns [] when no logs exist
 *
 * POST /api/notifications
 *   ✅ Dispatches items and returns { success, mode, count }
 *   ❌ 400 when required fields are missing
 *   ✅ Logs are prepended (newest at top) after dispatch
 *   ✅ Simulator mode is indicated in response
 * ============================================================
 */

import { GET, POST } from '@/app/api/notifications/route';
import * as db from '@/lib/db';
import * as whatsappLib from '@/lib/whatsapp';

jest.mock('@/lib/db', () => ({
  readTable: jest.fn(),
  writeTable: jest.fn(),
  initDatabase: jest.fn(),
}));

jest.mock('@/lib/whatsapp', () => ({
  sendWhatsAppAlert: jest.fn(),
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockWhatsApp = whatsappLib as jest.Mocked<typeof whatsappLib>;

function makeGet() {
  return { url: 'http://localhost/api/notifications' } as any;
}

function makePost(body: Record<string, any>) {
  return { url: 'http://localhost/api/notifications', json: async () => body } as any;
}

const NOTIFICATION_LOGS = [
  {
    classId: '9a',
    date: '2026-05-20',
    rollNumber: '9A-01',
    studentName: 'Alice',
    parentPhone: '+15551',
    message: 'Alice was absent today.',
    status: 'Simulator' as const,
    sid: 'SM001',
    timestamp: '2026-05-20T08:00:00.000Z',
  },
  {
    classId: '9a',
    date: '2026-05-21',
    rollNumber: '9A-02',
    studentName: 'Bob',
    parentPhone: '+15552',
    message: 'Bob was absent today.',
    status: 'Simulator' as const,
    sid: 'SM002',
    timestamp: '2026-05-21T09:00:00.000Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.writeTable.mockResolvedValue(undefined);
});

// ════════════════════════════════════════════════════════════
// ① GET /api/notifications
// ════════════════════════════════════════════════════════════
describe('GET /api/notifications', () => {
  it('returns an array of notification logs', async () => {
    mockDb.readTable.mockResolvedValueOnce(NOTIFICATION_LOGS as any);
    const res = await GET(makeGet());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
  });

  it('returns logs sorted in reverse chronological order (newest first)', async () => {
    mockDb.readTable.mockResolvedValueOnce(NOTIFICATION_LOGS as any);
    const res = await GET(makeGet());
    const json = await res.json();
    const timestamps = json.map((n: any) => new Date(n.timestamp).getTime());
    expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1]);
  });

  it('returns an empty array when no logs exist', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('each log entry has required shape fields', async () => {
    mockDb.readTable.mockResolvedValueOnce(NOTIFICATION_LOGS as any);
    const res = await GET(makeGet());
    const json = await res.json();
    const entry = json[0];
    expect(entry).toHaveProperty('classId');
    expect(entry).toHaveProperty('date');
    expect(entry).toHaveProperty('rollNumber');
    expect(entry).toHaveProperty('studentName');
    expect(entry).toHaveProperty('parentPhone');
    expect(entry).toHaveProperty('status');
    expect(entry).toHaveProperty('sid');
    expect(entry).toHaveProperty('timestamp');
  });
});

// ════════════════════════════════════════════════════════════
// ② POST /api/notifications
// ════════════════════════════════════════════════════════════
describe('POST /api/notifications', () => {
  const validPayload = {
    classId: '9a',
    date: '2026-05-25',
    dispatches: [
      {
        rollNumber: '9A-01',
        studentName: 'Alice',
        parentPhone: '+15551',
        message: 'Alice was absent on 2026-05-25.',
      },
    ],
  };

  it('returns 200 with success, mode and count when dispatching in simulator mode', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any); // existing logs
    mockWhatsApp.sendWhatsAppAlert.mockResolvedValue({ success: true, messageId: 'WASIM01', mode: 'Simulator' });

    const res = await POST(makePost(validPayload));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.mode).toBe('Simulator');
    expect(json.count).toBe(1);
  });

  it('returns count equal to the number of dispatched items', async () => {
    const payload = {
      classId: '9a',
      date: '2026-05-25',
      dispatches: [
        { rollNumber: '9A-01', studentName: 'Alice', parentPhone: '+1', message: 'M1' },
        { rollNumber: '9A-02', studentName: 'Bob',   parentPhone: '+2', message: 'M2' },
        { rollNumber: '9A-03', studentName: 'Carol', parentPhone: '+3', message: 'M3' },
      ],
    };
    mockDb.readTable.mockResolvedValueOnce([] as any);
    mockWhatsApp.sendWhatsAppAlert.mockResolvedValue({ success: true, messageId: 'WA_SID', mode: 'Simulator' });

    const res = await POST(makePost(payload));
    const json = await res.json();
    expect(json.count).toBe(3);
  });

  it('new logs are prepended to existing logs (newest first)', async () => {
    mockDb.readTable.mockResolvedValueOnce(NOTIFICATION_LOGS as any);
    mockWhatsApp.sendWhatsAppAlert.mockResolvedValue({ success: true, messageId: 'WANEW', mode: 'Simulator' });

    await POST(makePost(validPayload));

    const writtenLogs = mockDb.writeTable.mock.calls[0][1] as any[];
    // New log at index 0 (prepended)
    expect(writtenLogs[0].rollNumber).toBe('9A-01');
    expect(writtenLogs[0].date).toBe('2026-05-25');
    // Old logs preserved at the end
    expect(writtenLogs).toHaveLength(NOTIFICATION_LOGS.length + 1);
  });

  it('calls sendWhatsAppAlert with the correct phone and message', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    mockWhatsApp.sendWhatsAppAlert.mockResolvedValue({ success: true, messageId: 'WA_SID', mode: 'Simulator' });

    await POST(makePost(validPayload));
    expect(mockWhatsApp.sendWhatsAppAlert).toHaveBeenCalledWith(
      validPayload.dispatches[0].parentPhone,
      validPayload.dispatches[0].message,
      expect.anything()
    );
  });

  it('returns 400 when classId is missing from payload', async () => {
    const res = await POST(makePost({ date: '2026-05-25', dispatches: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when date is missing from payload', async () => {
    const res = await POST(makePost({ classId: '9a', dispatches: [] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when dispatches is not an array', async () => {
    const res = await POST(makePost({ classId: '9a', date: '2026-05-25', dispatches: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('marks log status as Sent when mode is WhatsApp', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    mockWhatsApp.sendWhatsAppAlert.mockResolvedValue({ success: true, messageId: 'WA_REAL', mode: 'WhatsApp' });

    await POST(makePost(validPayload));
    const writtenLogs = mockDb.writeTable.mock.calls[0][1] as any[];
    expect(writtenLogs[0].status).toBe('Sent');
  });

  it('marks log status as Simulator when mode is Simulator', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    mockWhatsApp.sendWhatsAppAlert.mockResolvedValue({ success: true, messageId: 'WA_SIM', mode: 'Simulator' });

    await POST(makePost(validPayload));
    const writtenLogs = mockDb.writeTable.mock.calls[0][1] as any[];
    expect(writtenLogs[0].status).toBe('Simulator');
  });

  it('marks log status as Failed when SMS send is unsuccessful', async () => {
    mockDb.readTable.mockResolvedValueOnce([] as any);
    mockWhatsApp.sendWhatsAppAlert.mockResolvedValue({ success: false, mode: 'WhatsApp', error: 'network' });

    await POST(makePost(validPayload));
    const writtenLogs = mockDb.writeTable.mock.calls[0][1] as any[];
    expect(writtenLogs[0].status).toBe('Failed');
  });
});
