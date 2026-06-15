"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, SlidersHorizontal } from "lucide-react";

import {
  useAdminControllerGetEvents,
  useAdminControllerGetDashboardStats,
  adminControllerApproveEvent,
  adminControllerDeclineEvent,
  getAdminControllerGetEventsQueryKey,
} from "@/lib/api/generated/admin/admin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AdminEventsListResponse,
  AdminEventSummary,
  AdminStatus,
  DashboardStats,
} from "@/lib/api/types/admin";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

// ─── Status styling ───────────────────────────────────────────────────────────

type NormStatus = "approved" | "pending" | "declined";

const statusStyle: Record<NormStatus, { bg: string; color: string; label: string }> = {
  approved: { bg: "#dcfce7", color: "#16a34a", label: "Approved" },
  pending:  { bg: "#fef9c3", color: "#ca8a04", label: "New" },
  declined: { bg: "#fee2e2", color: "#dc2626", label: "Declined" },
};

function normStatus(s?: AdminStatus): NormStatus {
  if (s === "APPROVED") return "approved";
  if (s === "DECLINED") return "declined";
  return "pending";
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB");
  } catch {
    return iso;
  }
}

// ─── Stat card icons ──────────────────────────────────────────────────────────

const statCards = [
  {
    key: "total" as const,
    label: "Total Events",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    key: "upcoming" as const,
    label: "Upcoming Events",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01" />
      </svg>
    ),
  },
  {
    key: "past" as const,
    label: "Past Events",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "pending" as const,
    label: "Events Request",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M12 12v4m0 0h.01" />
      </svg>
    ),
  },
  {
    key: "declined" as const,
    label: "Declined Events",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 14l6-6m0 6L9 8" />
      </svg>
    ),
    iconColor: "#ef4444",
  },
];

const PAGE_SIZE = 10;

// ─── Main component ───────────────────────────────────────────────────────────

export default function EventModerationList() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // ── Read filter state from URL ───────────────────────────────────────────────
  const page         = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const statusFilter = searchParams.get("status") ?? "All";
  const startDate    = searchParams.get("startDate") ?? "";
  const endDate      = searchParams.get("endDate") ?? "";
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
  const apiStatus = statusFilter !== "All" ? statusFilter.toUpperCase() : undefined;

  const eventsQueryParams = {
    page,
    perPage: PAGE_SIZE,
    ...(apiStatus    && { status: apiStatus }),
    ...(searchInUrl  && { search: searchInUrl }),
    ...(startDate    && { startDate }),
    ...(endDate      && { endDate }),
  };

  const { data: eventsRaw, isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } =
    useAdminControllerGetEvents(eventsQueryParams);

  const { data: statsRaw } = useAdminControllerGetDashboardStats();

  const eventsResp = eventsRaw  as unknown as AdminEventsListResponse | undefined;
  const stats      = statsRaw   as unknown as DashboardStats | undefined;

  useEffect(() => {
    console.log("[event-moderation] eventsRaw:", eventsRaw);
    console.log("[event-moderation] statsRaw:", statsRaw);
  }, [eventsRaw, statsRaw]);

  const events    = eventsResp?.data  ?? [];
  const meta      = eventsResp?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const totalCount = meta?.total ?? 0;

  // ── Inline approve / decline mutations ───────────────────────────────────────
  const [pendingAction, setPendingAction] = useState<{ id: string; action: "approve" | "decline" } | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);

  const invalidateEvents = () => {
    queryClient.invalidateQueries({ queryKey: getAdminControllerGetEventsQueryKey(eventsQueryParams) });
  };

  const approveMut = useMutation({
    mutationFn: ({ id }: { id: string }) => adminControllerApproveEvent(id),
    onMutate: ({ id }) => { setPendingAction({ id, action: "approve" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); invalidateEvents(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Approve failed"); },
  });

  const declineMut = useMutation({
    mutationFn: ({ id }: { id: string }) => adminControllerDeclineEvent(id, {}),
    onMutate: ({ id }) => { setPendingAction({ id, action: "decline" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); invalidateEvents(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Decline failed"); },
  });

  // ── Stat card values (from dashboard stats) ──────────────────────────────────
  const statValues: Record<string, number | string> = {
    total:    stats?.gadarings.total    ?? "—",
    upcoming: stats?.gadarings.upcoming ?? "—",
    past:     stats?.gadarings.past     ?? "—",
    pending:  stats?.reviews.pending    ?? "—",
    declined: "—", // no API field
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col justify-between p-4 rounded-xl"
            style={{ backgroundColor: "#ffffff", minHeight: 88 }}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-gray-500 leading-tight">{card.label}</span>
              <span style={{ color: card.iconColor ?? "#9ca3af" }}>{card.icon}</span>
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
          <p className="text-xs text-gray-400 mt-0.5">Table showing the list of all Events</p>
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
            <label className="text-xs text-gray-500 font-medium">Start Date:</label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2" style={{ borderColor: "#e5e7eb" }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setParam("startDate", e.target.value)}
                className="text-xs text-gray-600 w-28 outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">End Date:</label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2" style={{ borderColor: "#e5e7eb" }}>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setParam("endDate", e.target.value)}
                className="text-xs text-gray-600 w-28 outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setParam("status", e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gray-600 outline-none"
              style={{ borderColor: "#e5e7eb", minWidth: 80 }}
            >
              <option value="All">All</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Declined">Declined</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500 font-medium">Search:</label>
            <div className="flex items-center border rounded-lg px-3 py-2 gap-2" style={{ borderColor: "#e5e7eb" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
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
                  {["S/N", "Event Name", "Date Created", "Convener", "Phone No", "Email", "Event Date", "Action"].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event: AdminEventSummary, i: number) => {
                  const s = statusStyle[normStatus(event.adminStatus)];
                  const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                  const isActing = pendingAction?.id === event.id;
                  return (
                    <tr key={event.id} style={{ borderBottom: "1px solid #f9fafb" }} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 text-xs text-gray-500">{rowNum}.</td>
                      <td className="py-3 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">{event.title}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(event.createdAt)}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{event.convener?.name ?? "—"}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{event.convener?.phone ?? "—"}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{event.convener?.email ?? "—"}</td>
                      <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(event.startDate)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: s.bg, color: s.color }}
                          >
                            {s.label}
                          </span>
                          <Link
                            href={`/dashboard/event-moderation/${event.id}`}
                            className="px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: "#f59e0b" }}
                          >
                            View
                          </Link>
                          <button
                            disabled={isActing}
                            onClick={() => approveMut.mutate({ id: event.id })}
                            className="px-2 py-0.5 rounded text-xs font-medium text-white disabled:opacity-50"
                            style={{ backgroundColor: "#22c55e" }}
                          >
                            {isActing && pendingAction?.action === "approve" ? "…" : "Approve"}
                          </button>
                          <button
                            disabled={isActing}
                            onClick={() => declineMut.mutate({ id: event.id })}
                            className="px-2 py-0.5 rounded text-xs font-medium text-white disabled:opacity-50"
                            style={{ backgroundColor: "#ef4444" }}
                          >
                            {isActing && pendingAction?.action === "decline" ? "…" : "Decline"}
                          </button>
                        </div>
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
