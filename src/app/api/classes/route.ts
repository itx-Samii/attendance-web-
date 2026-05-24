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
    
    // Check if classId already exists
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
