import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setAuthCookie } from '@/lib/auth/cookies';

const schema = z.object({
  email: z.string().email(),
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

  const data = await upstream.json() as {
    success: boolean;
    message?: string;
    data?: { accessToken: string; admin: { id: string; name: string; email: string; role: string } };
  };

  if (!upstream.ok || !data.success || !data.data) {
    return NextResponse.json(
      { success: false, message: data.message ?? 'Invalid credentials' },
      { status: upstream.status },
    );
  }

  await setAuthCookie(data.data.accessToken);

  return NextResponse.json({ success: true, admin: data.data.admin });
}
