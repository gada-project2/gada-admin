import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setAuthCookie } from '@/lib/auth/cookies';

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const API_ORIGIN = process.env.API_ORIGIN!;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Email and password are required' },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  let upstream: Response;
  try {
    upstream = await fetch(`${API_ORIGIN}/v1/admin/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message ?? 'Service unavailable' },
      { status: 502 },
    );
  }

  // Verified against production 2026-08-02: POST /v1/admin/auth/signin returns
  //   { success, data: { accessToken, expiresIn, admin: { id, email, name, isSuperAdmin } } }
  // The JWT field is `accessToken` (NOT `token`), and the admin object carries
  // `isSuperAdmin: boolean` — there is no `role` string.
  // Errors arrive as { success:false, error:{ code, message } }.
  const data = await upstream.json() as {
    success: boolean;
    error?: { code?: string; message?: string };
    message?: string;
    data?: {
      accessToken?: string;
      expiresIn?: number;
      admin?: { id: string; name: string; email: string; isSuperAdmin: boolean };
    };
  };

  if (!upstream.ok || !data.success || !data.data) {
    return NextResponse.json(
      {
        success: false,
        message: data.error?.message ?? data.message ?? 'Invalid credentials',
      },
      { status: upstream.status || 401 },
    );
  }

  const token = data.data.accessToken;

  // Defensive guard: a 2xx success envelope with no token means the upstream
  // contract changed (e.g. field renamed). Never set the cookie to undefined
  // and never report a logged-in state without a real token.
  if (typeof token !== 'string' || token.length === 0) {
    console.error(
      '[admin-login] signin succeeded but no token in response. ' +
        'Expected data.accessToken (string). Received data keys: ' +
        JSON.stringify(Object.keys(data.data)),
    );
    return NextResponse.json(
      { success: false, message: 'Login failed: malformed authentication response' },
      { status: 502 },
    );
  }

  await setAuthCookie(token);

  return NextResponse.json({ success: true, admin: data.data.admin });
}
