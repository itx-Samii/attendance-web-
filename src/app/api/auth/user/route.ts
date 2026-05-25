import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptSession, StaffUser } from '@/lib/authConfig';
import { readTable, writeTable } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('aura_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const session = decryptSession(sessionCookie.value);

    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: session.email,
        name: session.name,
        role: session.role,
        classId: session.classId || '',
        schoolId: session.schoolId || '',
      },
    });
  } catch (error) {
    console.error('Session retrieval API error:', error);
    return NextResponse.json(
      { error: 'An unexpected session checking error occurred.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('aura_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const session = decryptSession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    const users = await readTable<StaffUser>('users');
    const userIndex = users.findIndex(
      (u) => u.email.toLowerCase() === session.email.toLowerCase()
    );

    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const user = users[userIndex];
    if (user.password !== currentPassword) {
      return NextResponse.json(
        { error: 'Incorrect current password.' },
        { status: 400 }
      );
    }

    // Update password
    users[userIndex].password = newPassword;
    await writeTable('users', users);

    return NextResponse.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Password change API error:', error);
    return NextResponse.json(
      { error: 'An unexpected password change error occurred.' },
      { status: 500 }
    );
  }
}
