import { NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth/cookies';

const API_ORIGIN = process.env.API_ORIGIN!;

/**
 * Current-admin endpoint.
 *
 * The upstream API used to expose GET /v1/admin/auth/me; that route no longer
 * exists. The identity is instead recovered from the admin JWT itself (which
 * carries `sub`, `email` and `isAdmin`), then enriched with `name` /
 * `isSuperAdmin` from GET /v1/admin/admins when the caller is allowed to list
 * admins. Enrichment is best-effort: a non-super admin that gets 403 from the
 * list endpoint still receives a valid identity from the token claims.
 */

interface JwtClaims {
  sub?: string;
  email?: string;
  isAdmin?: boolean;
  exp?: number;
}

function decodeClaims(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as JwtClaims;
  } catch {
    return null;
  }
}

export async function GET() {
  const token = await getAuthToken();

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'unauthenticated' },
      { status: 401 },
    );
  }

  const claims = decodeClaims(token);

  if (!claims?.sub) {
    return NextResponse.json(
      { success: false, message: 'malformed session token' },
      { status: 401 },
    );
  }

  // Reject an expired token here rather than letting the UI render a stale identity.
  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
    return NextResponse.json(
      { success: false, message: 'session expired' },
      { status: 401 },
    );
  }

  const admin = {
    id: claims.sub,
    email: claims.email ?? '',
    name: '',
    isSuperAdmin: false,
  };

  try {
    const upstream = await fetch(`${API_ORIGIN}/v1/admin/admins`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (upstream.ok) {
      const body = await upstream.json() as {
        success?: boolean;
        data?: Array<{ id: string; email: string; name: string; isSuperAdmin: boolean }>;
      };
      const row = body.data?.find((a) => a.id === claims.sub);
      if (row) {
        admin.name = row.name;
        admin.email = row.email;
        admin.isSuperAdmin = row.isSuperAdmin;
      }
    }
  } catch {
    // Enrichment is optional — fall through with the token-derived identity.
  }

  // Fall back to the local part of the email so the UI always has something to show.
  if (!admin.name) {
    admin.name = admin.email.split('@')[0] || 'Admin';
  }

  return NextResponse.json({ success: true, data: admin });
}
