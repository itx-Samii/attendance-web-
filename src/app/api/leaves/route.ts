import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/authConfig';
import { readTable, writeTable, initDatabase } from '@/lib/db';

interface LeaveRequest {
  id: string;
  rollNumber: string;
  studentName: string;
  classId: string;
  className: string;
  startDate: string;
  endDate: string;
  type: 'Medical' | 'Casual' | 'Family' | 'Emergency';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string;
}

interface AttendanceRecord {
  rollNumber: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  remarks?: string;
}

interface DailyAttendance {
  classId: string;
  date: string;
  records: AttendanceRecord[];
}

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('aura_session');
  if (!sessionCookie || !sessionCookie.value) return null;
  return decryptSession(sessionCookie.value);
}

function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  
  // Make sure we iterate correctly
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    await initDatabase();
    const leaves = await readTable<LeaveRequest>('leaves');
    
    // Sort reverse-chronologically by requestDate
    const sorted = leaves.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    return NextResponse.json(sorted);
  } catch (error: any) {
    console.error('Failed to retrieve leaves:', error);
    return NextResponse.json({ error: 'Failed to retrieve leaves.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const { rollNumber, studentName, classId, className, startDate, endDate, type, reason } = await req.json();

    if (!rollNumber || !studentName || !classId || !className || !startDate || !endDate || !type || !reason) {
      return NextResponse.json({ error: 'Missing required leave request parameters.' }, { status: 400 });
    }

    await initDatabase();
    const leaves = await readTable<LeaveRequest>('leaves');

    const newRequest: LeaveRequest = {
      id: 'LV' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      rollNumber,
      studentName,
      classId,
      className,
      startDate,
      endDate,
      type,
      reason,
      status: 'Pending',
      requestDate: new Date().toISOString(),
    };

    leaves.push(newRequest);
    await writeTable('leaves', leaves);

    return NextResponse.json({ success: true, leave: newRequest });
  } catch (error: any) {
    console.error('Failed to create leave request:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const { id, status } = await req.json();

    if (!id || !status || (status !== 'Approved' && status !== 'Rejected')) {
      return NextResponse.json({ error: 'Invalid payload. id and status (Approved/Rejected) are required.' }, { status: 400 });
    }

    await initDatabase();
    const leaves = await readTable<LeaveRequest>('leaves');
    const leaveIndex = leaves.findIndex((l) => l.id === id);

    if (leaveIndex === -1) {
      return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });
    }

    const leave = leaves[leaveIndex];
    leave.status = status;
    await writeTable('leaves', leaves);

    // Dynamic Automation: If leave is APPROVED, write/upsert corresponding Leave status into Daily attendance records
    if (status === 'Approved') {
      const targetDates = getDatesInRange(leave.startDate, leave.endDate);
      const allAttendance = await readTable<DailyAttendance>('attendance');

      for (const date of targetDates) {
        const existingIndex = allAttendance.findIndex(
          (a) => a.classId.toLowerCase() === leave.classId.toLowerCase() && a.date === date
        );

        const recordEntry: AttendanceRecord = {
          rollNumber: leave.rollNumber,
          status: 'Leave',
          remarks: `Approved Leave: [${leave.type}] ${leave.reason}`,
        };

        if (existingIndex !== -1) {
          // Classroom daily register exists. Upsert student's row
          const records = allAttendance[existingIndex].records;
          const studentRecordIndex = records.findIndex((r) => r.rollNumber === leave.rollNumber);
          
          if (studentRecordIndex !== -1) {
            records[studentRecordIndex] = recordEntry;
          } else {
            records.push(recordEntry);
          }
        } else {
          // Create new classroom daily register for this date
          allAttendance.push({
            classId: leave.classId,
            date,
            records: [recordEntry],
          });
        }
      }

      await writeTable('attendance', allAttendance);
    }

    return NextResponse.json({ success: true, leave });
  } catch (error: any) {
    console.error('Failed to update leave request:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
