import { NextRequest, NextResponse } from 'next/server';
import { readTable, writeTable, initDatabase } from '@/lib/db';
import { getSession } from '@/lib/authConfig';

interface Student {
  rollNumber: string;
  name: string;
  parentPhone: string;
  classId: string;
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
    
    if (!classId) {
      return NextResponse.json(
        { error: 'Missing classId query parameter' },
        { status: 400 }
      );
    }
    
    const allStudents = await readTable<Student>('students');
    const filteredStudents = allStudents.filter(
      (student) =>
        student.classId?.toLowerCase() === classId.toLowerCase() &&
        (student.schoolId || 'school-aura') === schoolId
    );
    
    return NextResponse.json(filteredStudents);
  } catch (error: any) {
    console.error('API Error in GET /api/students:', error);
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
    const { rollNumber, name, parentPhone, classId } = body;

    if (session) {
      if (session.role !== 'admin' && session.role !== 'teacher') {
        return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
      }
      if (session.role === 'teacher' && classId && classId.toLowerCase() !== session.classId?.toLowerCase()) {
        return NextResponse.json({ error: 'Access Denied. Teachers can only register students in their assigned classroom.' }, { status: 403 });
      }
    }

    if (!rollNumber || !name || !parentPhone || !classId) {
      return NextResponse.json(
        { error: 'Missing rollNumber, name, parentPhone, or classId in request body' },
        { status: 400 }
      );
    }

    const students = await readTable<Student>('students');
    // Duplication checked strictly within the same school boundary
    if (students.some((s) => s.rollNumber.toLowerCase() === rollNumber.toLowerCase() && (s.schoolId || 'school-aura') === schoolId)) {
      return NextResponse.json(
        { error: `Student with Roll Number "${rollNumber}" already exists in this school` },
        { status: 400 }
      );
    }

    const classes = await readTable<any>('classes');
    if (!classes.some((c: any) => c.classId.toLowerCase() === classId.toLowerCase() && (c.schoolId || 'school-aura') === schoolId)) {
      return NextResponse.json(
        { error: `Class with Section Code "${classId}" does not exist in this school` },
        { status: 400 }
      );
    }

    const newStudent: Student = {
      rollNumber: rollNumber.trim(),
      name: name.trim(),
      parentPhone: parentPhone.trim(),
      classId: classId.toLowerCase().trim(),
      schoolId: schoolId,
    };
    students.push(newStudent);
    await writeTable('students', students);

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error: any) {
    console.error('API Error in POST /api/students:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await initDatabase();
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'test') {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const schoolId = session?.schoolId || 'school-aura';
    const body = await request.json();
    const { rollNumber, name, parentPhone, classId } = body;

    if (!rollNumber) {
      return NextResponse.json(
        { error: 'Missing rollNumber in request body' },
        { status: 400 }
      );
    }

    const students = await readTable<Student>('students');
    const idx = students.findIndex((s) => s.rollNumber.toLowerCase() === rollNumber.toLowerCase() && (s.schoolId || 'school-aura') === schoolId);
    if (idx === -1) {
      return NextResponse.json(
        { error: `Student "${rollNumber}" not found` },
        { status: 404 }
      );
    }

    if (session) {
      if (session.role !== 'admin' && session.role !== 'teacher') {
        return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
      }
      if (session.role === 'teacher') {
        const student = students[idx];
        if (student.classId.toLowerCase() !== session.classId?.toLowerCase()) {
          return NextResponse.json({ error: 'Access Denied. Teachers can only modify students in their assigned classroom.' }, { status: 403 });
        }
        if (classId && classId.toLowerCase() !== session.classId?.toLowerCase()) {
          return NextResponse.json({ error: 'Access Denied. Teachers cannot move students to other classrooms.' }, { status: 403 });
        }
      }
    }

    if (name) students[idx].name = name.trim();
    if (parentPhone) students[idx].parentPhone = parentPhone.trim();
    if (classId) {
      const classes = await readTable<any>('classes');
      if (!classes.some((c: any) => c.classId.toLowerCase() === classId.toLowerCase() && (c.schoolId || 'school-aura') === schoolId)) {
        return NextResponse.json(
          { error: `Class with Section Code "${classId}" does not exist in this school` },
          { status: 400 }
        );
      }
      students[idx].classId = classId.toLowerCase().trim();
    }
    await writeTable('students', students);

    return NextResponse.json({ success: true, student: students[idx] });
  } catch (error: any) {
    console.error('API Error in PUT /api/students:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initDatabase();
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'test') {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const schoolId = session?.schoolId || 'school-aura';
    const { searchParams } = new URL(request.url);
    const rollNumber = searchParams.get('rollNumber');

    if (!rollNumber) {
      return NextResponse.json(
        { error: 'Missing rollNumber query parameter' },
        { status: 400 }
      );
    }

    const students = await readTable<Student>('students');
    const student = students.find((s) => s.rollNumber.toLowerCase() === rollNumber.toLowerCase() && (s.schoolId || 'school-aura') === schoolId);
    if (!student) {
      return NextResponse.json(
        { error: `Student "${rollNumber}" not found` },
        { status: 404 }
      );
    }

    if (session) {
      if (session.role !== 'admin' && session.role !== 'teacher') {
        return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
      }
      if (session.role === 'teacher' && student.classId.toLowerCase() !== session.classId?.toLowerCase()) {
        return NextResponse.json({ error: 'Access Denied. Teachers can only delete students in their assigned classroom.' }, { status: 403 });
      }
    }

    const filtered = students.filter(
      (s) => !(s.rollNumber.toLowerCase() === rollNumber.toLowerCase() && (s.schoolId || 'school-aura') === schoolId)
    );
    await writeTable('students', filtered);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error in DELETE /api/students:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
