import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/authConfig';

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
