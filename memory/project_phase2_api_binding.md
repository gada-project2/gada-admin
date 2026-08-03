---
name: project-phase2-api-binding
description: Phase 2 completion — real API data bound to 4 dashboard screens, types, primitives, and data gaps documented
metadata:
  type: project
---

Phase 2 complete (2026-06-12). All 4 screens wired to live API.

**Why:** Replace hardcoded arrays with real data from the Gada dev API via BFF proxy + TanStack Query hooks.

**How to apply:** When working on Phase 3 (5 unbuilt screens), follow the same pattern:
- Types → `lib/api/types/admin.ts`
- Generated hooks for queries; `useMutation` directly (not generated wrappers) for mutations — generated wrappers collapse to `never` due to complex union TData types
- URL-based filter state via `useSearchParams` + `useRouter().replace`
- `Suspense` wrapper required on pages that use `useSearchParams`
- `params` must be `await`-ed in Next.js 16 async server pages

**Key fix in `lib/api/client.ts`:** When the API response includes top-level `meta` (pagination), the client now returns `{ data, meta }` instead of just `data`. Affects events list endpoint.

**Data gaps (no API endpoint exists yet):**
- Stats: Paid Events, Free Events, Total Tickets (have only `totalPurchases`), Ticket Available, Declined Events count
- Charts: TicketChart — no `/v1/admin/dashboard/chart/tickets` endpoint
- Calendar: `CalendarEventItem` description field not present in real payload (description removed from UI)

**Related:** [[project_auth_phase1]]
