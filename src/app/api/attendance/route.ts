import { NextRequest, NextResponse } from 'next/server';
import { readTable, writeTable, initDatabase } from '@/lib/db';
import { getSession } from '@/lib/authConfig';

interface AttendanceRecord {
  rollNumber: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  remarks?: string;
}

interface DailyAttendance {
  classId: string;
  date: string;
  records: AttendanceRecord[];
  schoolId: string;
}

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'test') {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }
    
    const schoolId = session?.schoolId || 'school-aura';
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');
    
    const allAttendance = await readTable<DailyAttendance>('attendance');

    if (!classId) {
      if (date) {
        const schoolRecords = allAttendance.filter(
          (record) =>
            record.date === date &&
            (record.schoolId || 'school-aura') === schoolId
        );
        return NextResponse.json(schoolRecords);
      }
      return NextResponse.json(
        { error: 'Missing classId query parameter' },
        { status: 400 }
      );
    }
    
    if (date) {
      const matchedRecord = allAttendance.find(
        (record) =>
          record.classId?.toLowerCase() === classId.toLowerCase() &&
          record.date === date &&
          (record.schoolId || 'school-aura') === schoolId
      );
      return NextResponse.json(matchedRecord ? matchedRecord.records : []);
    } else {
      const matchedRecords = allAttendance.filter(
        (record) =>
          record.classId?.toLowerCase() === classId.toLowerCase() &&
          (record.schoolId || 'school-aura') === schoolId
      );
      return NextResponse.json(matchedRecords);
    }
  } catch (error: any) {
    console.error('API Error in GET /api/attendance:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'test') {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }
    
    const schoolId = session?.schoolId || 'school-aura';
    const body = await request.json();
    const { classId, date, records } = body;
    
    if (!classId || !date || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid payload. classId, date (string), and records (array) are required.' },
        { status: 400 }
      );
    }
    
    const allAttendance = await readTable<DailyAttendance>('attendance');
    
    // Find index of existing record for this class & date scoped strictly by schoolId (clean upsert)
    const existingIndex = allAttendance.findIndex(
      (record) =>
        record.classId?.toLowerCase() === classId.toLowerCase() &&
        record.date === date &&
        (record.schoolId || 'school-aura') === schoolId
    );
    
    const updatedDailyRecord: DailyAttendance = {
      classId,
      date,
      schoolId: schoolId,
      records: records.map((rec: any) => ({
        rollNumber: rec.rollNumber,
        status: rec.status,
        remarks: rec.remarks || ''
      }))
    };
    
    if (existingIndex !== -1) {
      allAttendance[existingIndex] = updatedDailyRecord;
    } else {
      allAttendance.push(updatedDailyRecord);
    }
    
    await writeTable('attendance', allAttendance);
    
    return NextResponse.json({ success: true, message: 'Attendance saved successfully' });
  } catch (error: any) {
    console.error('API Error in POST /api/attendance:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
