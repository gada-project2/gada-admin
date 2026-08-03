---
name: project-calendar-datatable-fixes
description: Bug fixes — DataTable footer count fallback + CalendarPage 3-view toggle (Month/Week/Day)
metadata:
  type: project
---

Fixed 2026-06-12.

**DataTable footer (components/ui/DataTable.tsx):**
- `totalCount` now falls back to `rows.length` when `meta` is undefined (non-paginated tables like Settings admins list).
- With `meta` present: shows paginated "Showing X–Y of Z entries"; without `meta`: shows "N entries".
- Pager hidden when `meta` is absent (via existing `totalPages > 1` guard).

**CalendarPage (components/CalendarPage.tsx):**
- Root cause: `view` state existed and toggle updated it, but render body was a hardcoded week grid with zero branching on `view`. Day/Month had no render path at all.
- Fixed by adding `renderMonth()`, `renderWeek()`, `renderDay()` helper functions and a ternary branch in the card render.
- Month view: full grid via `getMonthGrid(year, month)`, events placed on date cells (up to 2 + "+N more").
- Week view: existing 7-day time grid, preserved as-is.
- Day view: filtered list from `eventsByDayKey[dateKey(anchor)]`.
- `prevWeek`/`nextWeek` replaced with `prevUnit`/`nextUnit` that step ±1 day/week or ±1 month.
- Added `goToday()` and a "Today" button in the header.
- `headerLabel()` shows full date for Day view, "Month Year" for Week/Month.
- Re-fetch is automatic: hook params are `anchor.getMonth()+1` and `anchor.getFullYear()`.
- Inline hex migrated to design tokens; status badge and event chip colors retained as-is (no matching tokens).

**Why:** CalendarWidget.tsx has the same structural bug (view state never branched) but is a dashboard widget — out of scope for this fix.

**How to apply:** CalendarWidget.tsx will need the same treatment if a full-calendar widget is required on the dashboard home.
