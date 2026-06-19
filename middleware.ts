import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Pagine pubbliche: login e register
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  if (!session?.user && !isAuthPage) {
    // Non autenticato → redirect al login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session?.user && isAuthPage) {
    // Già autenticato → redirect alla home
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protegge tutto tranne asset statici e API auth
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
