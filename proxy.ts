/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * Protects /dashboard and all nested routes with a presence check on the
 * gada_admin_token httpOnly cookie. Real validity is enforced server-side by
 * the API returning 401, which the BFF proxy handles by clearing the cookie.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('gada_admin_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
};
