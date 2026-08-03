---
name: project-phase3-vendors
description: Phase 3 — Vendors screen built, shared table primitive extracted, login bug fixed
metadata:
  type: project
---

Phase 3 complete (2026-06-12). Vendors screen live at /dashboard/vendors.

**Why:** Fifth screen in the admin dashboard; also extracted reusable table primitives for the remaining 4 screens.

**How to apply:** When building Conveners/Tickets/Notifications/Settings, follow the same pattern:
1. Introspect live API for row shape (or type from spec if empty)
2. Add types to `lib/api/types/admin.ts`
3. Use `useTableQuery` (lib/hooks/useTableQuery.ts) with the raw generated fetch fn + `queryKey` factory
4. Use `DataTable` (components/ui/DataTable.tsx) for the table UI
5. Use raw `useMutation` for mutations — generated hooks collapse to `never` for `void` responses
6. Invalidate with `queryClient.invalidateQueries({ queryKey: ["/v1/admin/<resource>"] })` base key

**Key fix in `app/api/auth/login/route.ts`:** The route was using `data.data.token` but the API returns `data.data.accessToken`. Fixed — httpOnly cookie now correctly populated.

**Vendor list endpoint:**
- GET /v1/admin/vendors?page&perPage&search&status
- Returns `{ data: Vendor[], meta: { page, perPage, total, totalPages } }` at envelope level
- All vendor rows are unverified-from-spec (endpoint returned empty list on 2026-06-12)
- `search` param causes backend 500 (Prisma bug in server code) — frontend shows ErrorState correctly

**Backend caveat:** `GET /v1/admin/vendors?search=...` returns 500 (server-side Prisma bug, not frontend). The status filter alone works fine.

**Related:** [[project_auth_phase1]], [[project_phase2_api_binding]]
