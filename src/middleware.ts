import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('aura_session');
  const { pathname } = request.nextUrl;

  // Protect administrative workspace routes
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/attendance') || 
    pathname.startsWith('/students') || 
    pathname.startsWith('/classes');

  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    // Persist target page for post-login redirect if necessary
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated teachers trying to hit login back to dashboard
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/attendance/:path*',
    '/students/:path*',
    '/classes/:path*',
    '/login'
  ]
};
