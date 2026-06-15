/**
 * BFF catch-all proxy — forwards all /api/gada/** requests to the upstream API.
 *
 * URL join example:
 *   Browser requests  GET /api/gada/v1/admin/events?page=1
 *   [...path] params  → ['v1', 'admin', 'events']
 *   Upstream URL      → https://api.dev.gadaapp.com/v1/admin/events?page=1
 *
 * Auth: reads gada_admin_token from the httpOnly cookie and adds it as
 * Authorization: Bearer <token>. If the cookie is absent the request is
 * rejected before hitting the upstream. If the upstream returns 401 the
 * cookie is cleared so the browser drops the dead session.
 *
 * The upstream response (including the {success,data} envelope) is passed
 * straight through — client.ts unwraps it.
 */

import { NextRequest, NextResponse } from 'next/server';

const API_ORIGIN = process.env.API_ORIGIN!;

type Ctx = { params: Promise<{ path: string[] }> };

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

async function handler(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const token = request.cookies.get('gada_admin_token')?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'unauthenticated' },
      { status: 401 },
    );
  }

  const { path } = await ctx.params;
  const search = request.nextUrl.search; // '?...' or ''
  const upstreamUrl = `${API_ORIGIN}/${path.join('/')}${search}`;

  const upstreamInit: RequestInit = {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (METHODS_WITH_BODY.has(request.method)) {
    const text = await request.text();
    if (text) upstreamInit.body = text;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, upstreamInit);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message ?? 'Upstream unreachable' },
      { status: 502 },
    );
  }

  const body = await upstream.text();

  const response = new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });

  if (upstream.status === 401) {
    // Clear the dead session so the browser is forced back to login
    response.cookies.delete('gada_admin_token');
  }

  return response;
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as DELETE,
};
