import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findUserByEmail, encryptSession } from '@/lib/authConfig';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);

    if (user && user.password === password) {
      // 1. Multi-tenant License/Status Guard
      let schoolId = user.schoolId || '';
      if (user.role !== 'superadmin' && process.env.NODE_ENV !== 'test') {
        const { readTable } = await import('@/lib/db');
        const schools = await readTable<any>('schools');
        const school = schools.find((s) => s.schoolId === user.schoolId);

        if (!school) {
          return NextResponse.json(
            { error: 'Academic school profile not found.' },
            { status: 403 }
          );
        }

        if (school.status === 'suspended') {
          return NextResponse.json(
            { error: 'Access Denied. Your school account has been suspended by the platform administrator.' },
            { status: 403 }
          );
        }

        if (school.status === 'pending') {
          return NextResponse.json(
            { error: 'Registration Pending. Your school account is currently awaiting Super Admin review.' },
            { status: 403 }
          );
        }
      }

      // Create session active for 24 hours
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      const sessionData = {
        email: user.email,
        name: user.name,
        role: user.role,
        classId: user.classId || '',
        schoolId,
        expires: expiresAt
      };

      const token = encryptSession(sessionData);
      
      const cookieStore = await cookies();
      cookieStore.set('aura_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours in seconds
      });

      return NextResponse.json({
        success: true,
        user: {
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
