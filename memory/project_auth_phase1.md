---
name: project-auth-phase1
description: Phase 1 BFF auth implementation — cookie pattern, Next.js 16 proxy rename, client.ts signature fix
metadata:
  type: project
---

Phase 1 admin auth implemented using httpOnly cookie + BFF/same-origin proxy pattern.

**Key architecture facts:**
- Generated spec paths include `/v1` (e.g. `/v1/admin/auth/signin`, `/v1/admin/events`)
- Browser base URL is `/api/gada` (NEXT_PUBLIC_API_BASE_URL) — NOT the real API origin
- `customInstance(url, init?)` signature — generated code calls it as `(url, init)` not `({url,method,...})`
- API_ORIGIN=https://api.dev.gadaapp.com is server-only (no NEXT_PUBLIC_ prefix)
- Auth token stored as httpOnly cookie `gada_admin_token`, 8h maxAge, SameSite=Strict

**Files created/modified:**
- `lib/api/client.ts` — rewritten to `(url, init?)` signature, unwraps `{success,data}` envelope
- `lib/auth/cookies.ts` — server helpers using `await cookies()` from next/headers
- `app/api/gada/[...path]/route.ts` — BFF catch-all proxy, adds Bearer token from cookie
- `app/api/auth/login/route.ts` — zod-validated, calls API_ORIGIN directly, sets cookie
- `app/api/auth/logout/route.ts` — clears cookie (no upstream call needed)
- `components/LoginPage.tsx` — react-hook-form + zod, POSTs to /api/auth/login
- `proxy.ts` — Next.js 16 proxy (renamed from middleware.ts), protects /dashboard
- `lib/hooks/useAdmin.ts` — calls useAdminControllerGetMe, redirects on 401
- `components/Header.tsx` — shows real admin name/role from useAdmin
- `components/Sidebar.tsx` — logout button POSTs to /api/auth/logout

**Next.js 16 breaking change:**
Middleware renamed to "Proxy" — file is `proxy.ts` (not `middleware.ts`), named export is `proxy`.
The `middleware` file convention is deprecated.

**Why:** BFF pattern keeps JWT out of browser JS; proxy at /api/gada/* reads cookie server-side.
**How to apply:** Phase 2 data binding should use generated hooks directly — they hit /api/gada/* automatically via NEXT_PUBLIC_API_BASE_URL. No manual auth wiring needed.
