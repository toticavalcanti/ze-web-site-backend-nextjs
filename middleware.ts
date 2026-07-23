import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

// Instância leve do NextAuth, sem provider de banco: o middleware roda no Edge
// Runtime e não pode carregar mongoose/bcrypt.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth?.user && req.nextUrl.pathname.startsWith('/admin')) {
    const signInUrl = new URL('/auth/login', req.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*']
};
