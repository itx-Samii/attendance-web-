import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_CREDENTIALS, encryptSession } from '@/lib/authConfig';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (
      email.toLowerCase() === AUTH_CREDENTIALS.email.toLowerCase() &&
      password === AUTH_CREDENTIALS.password
    ) {
      // Create session active for 24 hours
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      const sessionData = {
        email: AUTH_CREDENTIALS.email,
        name: AUTH_CREDENTIALS.name,
        role: AUTH_CREDENTIALS.role,
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
          email: AUTH_CREDENTIALS.email,
          name: AUTH_CREDENTIALS.name,
          role: AUTH_CREDENTIALS.role
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
