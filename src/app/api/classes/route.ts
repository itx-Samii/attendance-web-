import { NextRequest, NextResponse } from 'next/server';
import { readTable, writeTable, initDatabase } from '@/lib/db';
import { getSession } from '@/lib/authConfig';

interface Classroom {
  classId: string;
  name: string;
  schoolId: string;
}

export async function GET() {
  try {
    await initDatabase();
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'test') {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const schoolId = session?.schoolId || 'school-aura';
    const classes = await readTable<Classroom>('classes');
    const filtered = classes.filter((c) => (c.schoolId || 'school-aura') === schoolId);
    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error('API Error in GET /api/classes:', error);
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

    // Only administrators (principals) can create classes
    if (session && session.role !== 'admin') {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    const schoolId = session?.schoolId || 'school-aura';
    const body = await request.json();
    const { classId, name } = body;

    if (!classId || !name) {
      return NextResponse.json(
        { error: 'Missing classId or name in request body' },
        { status: 400 }
      );
    }

    const classes = await readTable<Classroom>('classes');
    // Check duplication strictly within the same school
    if (classes.some((c) => c.classId.toLowerCase() === classId.toLowerCase() && (c.schoolId || 'school-aura') === schoolId)) {
      return NextResponse.json(
        { error: `Class with Section Code "${classId}" already exists` },
        { status: 400 }
      );
    }

    const newClass: Classroom = {
      classId: classId.toLowerCase().trim(),
      name: name.trim(),
      schoolId: schoolId || '',
    };
    classes.push(newClass);
    await writeTable('classes', classes);

    return NextResponse.json({ success: true, classroom: newClass });
  } catch (error: any) {
    console.error('API Error in POST /api/classes:', error);
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

    if (session && session.role !== 'admin') {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
    }

    const schoolId = session?.schoolId || 'school-aura';
    const body = await request.json();
    const { classId, name } = body;

    if (!classId || !name) {
      return NextResponse.json(
        { error: 'Missing classId or name in request body' },
        { status: 400 }
      );
    }

    const classes = await readTable<Classroom>('classes');
    const idx = classes.findIndex((c) => c.classId.toLowerCase() === classId.toLowerCase() && (c.schoolId || 'school-aura') === schoolId);
    if (idx === -1) {
      return NextResponse.json(
        { error: `Class "${classId}" not found` },
        { status: 404 }
      );
    }

    classes[idx] = { ...classes[idx], name: name.trim() };
    await writeTable('classes', classes);

    return NextResponse.json({ success: true, classroom: classes[idx] });
  } catch (error: any) {
    console.error('API Error in PUT /api/classes:', error);
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

    if (session && session.role !== 'admin') {
      return NextResponse.json({ error: 'Access Denied.' }, { status: 403 });
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

    const classes = await readTable<Classroom>('classes');
    const filtered = classes.filter((c) => !(c.classId.toLowerCase() === classId.toLowerCase() && (c.schoolId || 'school-aura') === schoolId));
    if (filtered.length === classes.length) {
      return NextResponse.json(
        { error: `Class "${classId}" not found` },
        { status: 404 }
      );
    }
    await writeTable('classes', filtered);

    // Cascade: remove all students belonging to the deleted class in this school
    const students = await readTable<any>('students');
    const remainingStudents = students.filter(
      (s: any) => !(s.classId?.toLowerCase() === classId.toLowerCase() && (s.schoolId || 'school-aura') === schoolId)
    );
    await writeTable('students', remainingStudents);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error in DELETE /api/classes:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
