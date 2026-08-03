"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, SlidersHorizontal } from "lucide-react";

import {
  useAdminControllerListEvents,
  useAdminControllerStats,
  adminControllerSuspendEvent,
  adminControllerDeleteEvent,
  getAdminControllerListEventsQueryKey,
} from "@/lib/api/generated/admin/admin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AdminEventsListResponse,
  AdminEventSummary,
  AdminEventStatus,
  DashboardStats,
} from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
import { keyToUrl } from "@/lib/utils/media";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

// ─── Status styling ───────────────────────────────────────────────────────────
//
// WORKFLOW CHANGE: this screen used to show Approved / New / Declined badges from
// an `adminStatus` field, driven by an admin approval queue. Both the field and
// the approve/decline endpoints were removed from the API. What's shown now is
// the event's own lifecycle status, which is what the API actually returns.

const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
  PUBLISHED: { bg: "#dcfce7", color: "#16a34a", label: "Published" },
  DRAFT:     { bg: "#f3f4f6", color: "#4b5563", label: "Draft" },
  CANCELLED: { bg: "#fee2e2", color: "#dc2626", label: "Cancelled" },
  SUSPENDED: { bg: "#ffedd5", color: "#c2410c", label: "Suspended" },
  COMPLETED: { bg: "#e0e7ff", color: "#4338ca", label: "Completed" },
};

function styleFor(status: AdminEventStatus) {
  return statusStyle[status] ?? { bg: "#f3f4f6", color: "#4b5563", label: status };
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB");
  } catch {
    return iso;
  }
}

// The status values GET /v1/admin/events accepts as a filter.
const STATUS_OPTIONS = ["All", "PUBLISHED", "DRAFT", "CANCELLED", "SUSPENDED"];

// ─── Stat cards ───────────────────────────────────────────────────────────────
// Only counters that genuinely exist on GET /v1/admin/dashboard/stats. The old
// Upcoming / Past / Events Request / Declined cards had no backing field.

const statCards = [
  {
    key: "totalEvents" as const,
    label: "Total Events",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    key: "publishedEvents" as const,
    label: "Published Events",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "newEventsToday" as const,
    label: "New Events Today",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M12 12v6m-3-3h6" />
      </svg>
    ),
  },
  {
    key: "checkedInToday" as const,
    label: "Checked In Today",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01" />
      </svg>
    ),
  },
];

const PAGE_SIZE = 10;

/**
 * Event banner thumbnail. bannerKey is a storage key, not a URL — keyToUrl()
 * resolves it. Falls back to a gradient tile when there is no banner or the
 * image fails to load, so a missing object never shows as a broken icon.
 */
function EventThumb({ name, bannerKey }: { name: string; bannerKey: string | null }) {
  const [failed, setFailed] = useState(false);
  const url = keyToUrl(bannerKey);

  if (!url || failed) {
    return (
      <div
        className="w-10 h-10 rounded-md shrink-0"
        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f59e0b 100%)" }}
        aria-label={`${name} (no banner)`}
        role="img"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${name} banner`}
      className="w-10 h-10 rounded-md object-cover shrink-0"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventModerationList() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // ── Read filter state from URL ───────────────────────────────────────────────
  const page         = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const statusFilter = searchParams.get("status") ?? "All";
  const searchInUrl  = searchParams.get("search") ?? "";

  // Local input mirrors URL search but debounces before pushing to URL
  const [searchInput, setSearchInput] = useState(searchInUrl);

  // Keep local input in sync if URL changes externally (e.g. browser back)
  useEffect(() => { setSearchInput(searchInUrl); }, [searchInUrl]);

  // Debounce: push to URL ~400 ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput) {
        params.set("search", searchInput);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL update helpers ───────────────────────────────────────────────────────
  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value); else params.delete(key);
      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const setPage = useCallback(
    (p: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(p));
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // ── API query params ─────────────────────────────────────────────────────────
  // The spec marks status/search/page/perPage as required strings; the API treats
  // empty strings as "no filter". There are NO startDate/endDate params on this
  // endpoint, so the old date-range filters were removed rather than left inert.
  const eventsQueryParams = {
    page: String(page),
    perPage: String(PAGE_SIZE),
    status: statusFilter !== "All" ? statusFilter : "",
    search: searchInUrl,
  };

  const { data: eventsRaw, isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } =
    useAdminControllerListEvents(eventsQueryParams);

  const { data: statsRaw } = useAdminControllerStats();

  const eventsResp = eventsRaw  as unknown as AdminEventsListResponse | undefined;
  const stats      = statsRaw   as unknown as DashboardStats | undefined;

  const events     = eventsResp?.data  ?? [];
  const meta       = eventsResp?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const totalCount = meta?.total ?? 0;

  // ── Inline suspend / delete mutations ────────────────────────────────────────
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "suspend" | "delete" } | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const invalidateEvents = () => {
    queryClient.invalidateQueries({ queryKey: getAdminControllerListEventsQueryKey(eventsQueryParams) });
  };

  const suspendMut = useMutation({
    mutationFn: ({ id }: { id: string }) => adminControllerSuspendEvent(id, {}),
    onMutate: ({ id }) => { setPendingAction({ id, action: "suspend" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); invalidateEvents(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Suspend failed"); },
  });

  const deleteMut = useMutation({
    mutationFn: ({ id }: { id: string }) => adminControllerDeleteEvent(id),
    onMutate: ({ id }) => { setPendingAction({ id, action: "delete" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); setConfirmDeleteId(null); invalidateEvents(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Delete failed"); },
  });

  // ── Stat card values (from dashboard stats) ──────────────────────────────────
  const statValues: Record<string, number | string> = {
    totalEvents:     stats?.totalEvents     ?? "—",
    publishedEvents: stats?.publishedEvents ?? "—",
    newEventsToday:  stats?.newEventsToday  ?? "—",
    checkedInToday:  stats?.checkedInToday  ?? "—",
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col justify-between p-4 rounded-xl"
            style={{ backgroundColor: "#ffffff", minHeight: 88 }}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-gray-500 leading-tight">{card.label}</span>
              <span style={{ color: "#9ca3af" }}>{card.icon}</span>
            </div>
            <p className="text-2xl font-bold mt-2" style={{ color: "#1a1a1a" }}>
              {typeof statValues[card.key] === "number"
                ? (statValues[card.key] as number).toLocaleString()
                : statValues[card.key]}
            </p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#ffffff" }}>
        <div>
          <h2 className="text-base font-bold text-gray-800">Events</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Table showing the list of all Events. Events go live without admin approval —
            the available admin actions are Suspend and Delete.
          </p>
        </div>

        {/* Inline action error */}
        {actionError && (
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
          >
            {actionError}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="status-filter" className="text-xs text-gray-500 font-medium">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setParam("status", e.target.value === "All" ? "" : e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gray-600 outline-none"
              style={{ borderColor: "#e5e7eb", minWidth: 120 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All" : styleFor(s as AdminEventStatus).label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="event-search" className="text-xs text-gray-500 font-medium">Search:</label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2" style={{ borderColor: "#e5e7eb" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                id="event-search"
                type="text"
                placeholder="Search by Event/Convener"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 text-xs text-gray-600 outline-none bg-transparent"
              />
              <SlidersHorizontal size={14} color="#9ca3af" />
            </div>
          </div>
        </div>

        {/* Table body states */}
        {eventsLoading && (
          <div className="flex items-center justify-center py-10">
            <Spinner size={28} />
          </div>
        )}

        {eventsError && (
          <ErrorState message="Failed to load events." onRetry={refetchEvents} />
        )}

        {!eventsLoading && !eventsError && events.length === 0 && (
          <EmptyState label="No events found" note="Try adjusting your filters or search term." />
        )}

        {!eventsLoading && !eventsError && events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                  {["S/N", "", "Event Name", "Status", "Convener", "Email", "Event Date", "Sold", "Revenue", "Action"].map((h, i) => (
                    <th key={`${h}-${i}`} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event: AdminEventSummary, i: number) => {
                  const s = styleFor(event.status);
                  const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                  const isActing = pendingAction?.id === event.id;
                  const isConfirming = confirmDeleteId === event.id;
                  return (
                    <tr key={event.id} style={{ borderBottom: "1px solid #f9fafb" }} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 text-xs text-gray-500">{rowNum}.</td>
                      <td className="py-3 px-3">
                        <EventThumb name={event.name} bannerKey={event.bannerKey} />
                      </td>
                      <td className="py-3 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">{event.name}</td>
                      <td className="py-3 px-3">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                          style={{ backgroundColor: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{event.convener?.displayName ?? "—"}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{event.convener?.email ?? "—"}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(event.startDate)}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{event.ticketsSold.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{formatNaira(event.totalRevenue)}</td>
                      <td className="py-3 px-3">
                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium" style={{ color: "#b91c1c" }}>
                              Delete permanently?
                            </span>
                            <button
                              disabled={isActing}
                              onClick={() => deleteMut.mutate({ id: event.id })}
                              className="px-2 py-0.5 rounded text-xs font-medium text-white disabled:opacity-50"
                              style={{ backgroundColor: "#ef4444" }}
                            >
                              {isActing ? "…" : "Yes"}
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 rounded text-xs font-medium border disabled:opacity-50"
                              style={{ borderColor: "#e5e7eb", color: "#374151" }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/dashboard/event-moderation/${event.id}`}
                              className="px-2 py-0.5 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: "#f59e0b" }}
                            >
                              View
                            </Link>
                            <button
                              disabled={isActing || event.status === "SUSPENDED"}
                              onClick={() => suspendMut.mutate({ id: event.id })}
                              className="px-2 py-0.5 rounded text-xs font-medium text-white disabled:opacity-50"
                              style={{ backgroundColor: "#f97316" }}
                            >
                              {isActing && pendingAction?.action === "suspend" ? "…" : "Suspend"}
                            </button>
                            <button
                              disabled={isActing}
                              onClick={() => setConfirmDeleteId(event.id)}
                              className="px-2 py-0.5 rounded text-xs font-medium text-white disabled:opacity-50"
                              style={{ backgroundColor: "#ef4444" }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!eventsLoading && !eventsError && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">
                {totalCount > 0
                  ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount} entries`
                  : "No entries"}
              </p>
              <button className="flex items-center gap-1 text-xs font-medium" style={{ color: "#f59e0b" }}>
                <Printer size={13} />
                Print List
              </button>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 rounded text-xs font-medium border disabled:opacity-40"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-7 h-7 rounded text-xs font-medium"
                    style={{
                      backgroundColor: page === p ? "#1a1a1a" : "transparent",
                      color: page === p ? "#ffffff" : "#374151",
                      border: page === p ? "none" : "1px solid #e5e7eb",
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 rounded text-xs font-medium border disabled:opacity-40"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between text-xs text-gray-400 pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
