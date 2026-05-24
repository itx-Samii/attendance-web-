import { NextRequest, NextResponse } from 'next/server';
import { readTable, writeTable, initDatabase } from '@/lib/db';

interface Classroom {
  classId: string;
  name: string;
}

export async function GET() {
  try {
    await initDatabase();
    const classes = await readTable<Classroom>('classes');
    return NextResponse.json(classes);
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
    const body = await request.json();
    const { classId, name } = body;

    if (!classId || !name) {
      return NextResponse.json(
        { error: 'Missing classId or name in request body' },
        { status: 400 }
      );
    }

    const classes = await readTable<Classroom>('classes');
    if (classes.some((c) => c.classId.toLowerCase() === classId.toLowerCase())) {
      return NextResponse.json(
        { error: `Class with Section Code "${classId}" already exists` },
        { status: 400 }
      );
    }

    const newClass: Classroom = {
      classId: classId.toLowerCase().trim(),
      name: name.trim()
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
    const body = await request.json();
    const { classId, name } = body;

    if (!classId || !name) {
      return NextResponse.json(
        { error: 'Missing classId or name in request body' },
        { status: 400 }
      );
    }

    const classes = await readTable<Classroom>('classes');
    const idx = classes.findIndex((c) => c.classId.toLowerCase() === classId.toLowerCase());
    if (idx === -1) {
      return NextResponse.json(
        { error: `Class "${classId}" not found` },
        { status: 404 }
      );
    }

    classes[idx] = { classId: classes[idx].classId, name: name.trim() };
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
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json(
        { error: 'Missing classId query parameter' },
        { status: 400 }
      );
    }

    const classes = await readTable<Classroom>('classes');
    const filtered = classes.filter((c) => c.classId.toLowerCase() !== classId.toLowerCase());
    if (filtered.length === classes.length) {
      return NextResponse.json(
        { error: `Class "${classId}" not found` },
        { status: 404 }
      );
    }
    await writeTable('classes', filtered);

    // Cascade: remove all students belonging to the deleted class
    const students = await readTable<any>('students');
    const remainingStudents = students.filter(
      (s: any) => s.classId?.toLowerCase() !== classId.toLowerCase()
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
