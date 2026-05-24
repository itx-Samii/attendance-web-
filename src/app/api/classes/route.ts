import { NextResponse } from 'next/server';
import { readTable, initDatabase } from '@/lib/db';

export async function GET() {
  try {
    // Ensure database directory and seeded tables exist
    await initDatabase();
    
    const classes = await readTable('classes');
    return NextResponse.json(classes);
  } catch (error: any) {
    console.error('API Error in /api/classes:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
