import { NextRequest, NextResponse } from 'next/server';
import { readTable, writeTable } from '@/lib/db';
import { sendSmsAlert } from '@/lib/twilio';

export interface DispatchItem {
  rollNumber: string;
  studentName: string;
  parentPhone: string;
  message: string;
}

export interface NotificationLog {
  classId: string;
  date: string;
  rollNumber: string;
  studentName: string;
  parentPhone: string;
  message: string;
  status: 'Sent' | 'Simulator' | 'Failed';
  sid: string;
  timestamp: string;
}

/**
 * GET: Retrieves historical parent alert dispatches from local database notifications.json.
 */
export async function GET(req: NextRequest) {
  try {
    const notifications = await readTable<NotificationLog>('notifications');
    // Sort in reverse chronological order (latest messages at top)
    const sorted = notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return NextResponse.json(sorted);
  } catch (error: any) {
    console.error('Failed to retrieve notification records:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching logs.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Handles parent notification dispatches.
 * Triggers Twilio API / sandbox simulator fallbacks and commits results atomically.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, date, dispatches } = body as {
      classId: string;
      date: string;
      dispatches: DispatchItem[];
    };

    if (!classId || !date || !Array.isArray(dispatches)) {
      return NextResponse.json(
        { error: 'Bad Request. Missing required payload parameters.' },
        { status: 400 }
      );
    }

    const existingNotifications = await readTable<NotificationLog>('notifications');
    const newLogs: NotificationLog[] = [];
    let activeMode: 'Twilio' | 'Simulator' = 'Simulator';

    // Process dispatches sequentially
    for (const item of dispatches) {
      const result = await sendSmsAlert(item.parentPhone, item.message);
      
      if (result.mode === 'Twilio') {
        activeMode = 'Twilio';
      }

      newLogs.push({
        classId,
        date,
        rollNumber: item.rollNumber,
        studentName: item.studentName,
        parentPhone: item.parentPhone,
        message: item.message,
        status: result.success ? (result.mode === 'Twilio' ? 'Sent' : 'Simulator') : 'Failed',
        sid: result.sid || '',
        timestamp: new Date().toISOString(),
      });
    }

    // Append new dispatches to the top of logs and write atomically
    const updatedLogs = [...newLogs, ...existingNotifications];
    await writeTable('notifications', updatedLogs);

    return NextResponse.json({
      success: true,
      mode: activeMode,
      count: newLogs.length,
    });
  } catch (error: any) {
    console.error('Failed to post notification alerts:', error);
    return NextResponse.json(
      { error: 'Failed to process SMS logs.' },
      { status: 500 }
    );
  }
}
