import { NextRequest, NextResponse } from 'next/server';
import { readTable, writeTable, initDatabase } from '@/lib/db';

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

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Missing classId query parameter' },
        { status: 400 }
      );
    }
    
    const allAttendance = await readTable<DailyAttendance>('attendance');
    
    if (date) {
      const matchedRecord = allAttendance.find(
        (record) =>
          record.classId?.toLowerCase() === classId.toLowerCase() &&
          record.date === date
      );
      return NextResponse.json(matchedRecord ? matchedRecord.records : []);
    } else {
      const matchedRecords = allAttendance.filter(
        (record) =>
          record.classId?.toLowerCase() === classId.toLowerCase()
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
    
    const body = await request.json();
    const { classId, date, records } = body;
    
    if (!classId || !date || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid payload. classId, date (string), and records (array) are required.' },
        { status: 400 }
      );
    }
    
    const allAttendance = await readTable<DailyAttendance>('attendance');
    
    // Find index of existing record for this class & date (to perform clean upsert)
    const existingIndex = allAttendance.findIndex(
      (record) =>
        record.classId?.toLowerCase() === classId.toLowerCase() &&
        record.date === date
    );
    
    const updatedDailyRecord: DailyAttendance = {
      classId,
      date,
      records: records.map((rec: any) => ({
        rollNumber: rec.rollNumber,
        status: rec.status,
        remarks: rec.remarks || ''
      }))
    };
    
    if (existingIndex !== -1) {
      // Overwrite existing record
      allAttendance[existingIndex] = updatedDailyRecord;
    } else {
      // Add new record
      allAttendance.push(updatedDailyRecord);
    }
    
    // Write back atomically
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
