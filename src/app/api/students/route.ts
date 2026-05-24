import { NextRequest, NextResponse } from 'next/server';
import { readTable, initDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Ensure database is seeded and ready
    await initDatabase();
    
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Missing classId query parameter' },
        { status: 400 }
      );
    }
    
    const allStudents = await readTable<any>('students');
    const filteredStudents = allStudents.filter(
      (student: any) => student.classId?.toLowerCase() === classId.toLowerCase()
    );
    
    return NextResponse.json(filteredStudents);
  } catch (error: any) {
    console.error('API Error in /api/students:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
