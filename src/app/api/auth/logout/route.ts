import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.set('aura_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Immediately expires the cookie
    });

    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during logout.' },
      { status: 500 }
    );
  }
}
