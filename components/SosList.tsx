"use client";

import { Fragment, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  adminControllerListSosEvents,
  getAdminControllerListSosEventsQueryKey,
  adminControllerRevealSosEvent,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListSosEventsParams } from "@/lib/api/generated/model/adminControllerListSosEventsParams";
import type {
  SosSummaryRow,
  SosListResponse,
  SosRevealResult,
} from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import { useAdmin } from "@/lib/hooks/useAdmin";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { MapPin, ShieldAlert } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY MODEL — read before touching this file.
//
// GET /v1/admin/safety/sos is deliberately PII-free: no name, no coordinates.
// Only GET /v1/admin/safety/sos/{id}/reveal returns identity + location, and
// the backend audits every single reveal call unconditionally (AdminLog
// SOS_REVEALED) — there is no way to call it without it being logged.
//
// That server-side guarantee only matters if the UI doesn't undermine it. So:
//   - Reveal is a per-row BUTTON the admin must click. Never fetch reveal data
//     automatically, on row click, on hover, or on page load.
//   - Revealed data is kept in LOCAL COMPONENT STATE only, keyed by row id. It
//     is never written to the URL, to react-query's cache under a shared key,
//     to localStorage, or anywhere else that would let it leak across a page
//     refresh, a shared screenshot, or another admin's session.
//   - A page refresh must re-hide everything that was revealed. There is no
//     "already revealed, skip the click" shortcut — every visit starts closed.
// ─────────────────────────────────────────────────────────────────────────────

interface RevealedState {
  data: SosRevealResult;
  revealedByName: string;
  revealedAt: Date;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function SosList() {
  const { admin } = useAdmin();

  // id -> revealed data, kept ONLY in this component's memory (see privacy
  // note above). Never persisted, never shared, gone on refresh.
  const [revealed, setRevealed] = useState<Record<string, RevealedState>>({});
  const [revealError, setRevealError] = useState<Record<string, string>>({});

  const { rows, meta, isLoading, isError, refetch, page, setPage, params, setParam } =
    useTableQuery<SosSummaryRow, AdminControllerListSosEventsParams>({
      fetchFn: adminControllerListSosEvents,
      queryKey: getAdminControllerListSosEventsQueryKey,
      mapParams: ({ page, perPage, extras }) => ({
        page: String(page),
        perPage: String(perPage),
        dateFrom: extras.dateFrom ?? "",
        dateTo: extras.dateTo ?? "",
      }),
      extractRows: (data) => (data as SosListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as SosListResponse | undefined)?.meta,
      perPage: 10,
      extraParamKeys: ["dateFrom", "dateTo"],
    });

  const revealMut = useMutation({
    mutationFn: (id: string) => adminControllerRevealSosEvent(id),
    onSuccess: (data, id) => {
      setRevealError((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setRevealed((prev) => ({
        ...prev,
        [id]: {
          data: data as unknown as SosRevealResult,
          revealedByName: admin?.name ?? "you",
          revealedAt: new Date(),
        },
      }));
    },
    onError: (err, id) => {
      setRevealError((prev) => ({
        ...prev,
        [id]: (err as Error).message ?? "Failed to reveal details",
      }));
    },
  });

  const [revealingId, setRevealingId] = useState<string | null>(null);

  function handleReveal(id: string) {
    setRevealingId(id);
    revealMut.mutate(id, { onSettled: () => setRevealingId(null) });
  }

  const perPage = meta?.perPage ?? 10;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#ffffff" }}>
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} color="#dc2626" />
          <div>
            <h2 className="text-base font-bold text-gray-800">SOS Events</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Summary only — no identity or location until explicitly revealed.
              Every reveal is permanently logged.
            </p>
          </div>
        </div>

        {/* Date range filter — same pattern the other list screens use for
            URL-driven extra params. */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="sos-from" className="text-xs text-gray-500 font-medium">
              From:
            </label>
            <input
              id="sos-from"
              type="date"
              value={params.dateFrom ?? ""}
              onChange={(e) => setParam("dateFrom", e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gray-600 outline-none"
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sos-to" className="text-xs text-gray-500 font-medium">
              To:
            </label>
            <input
              id="sos-to"
              type="date"
              value={params.dateTo ?? ""}
              onChange={(e) => setParam("dateTo", e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gray-600 outline-none"
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Spinner size={28} />
          </div>
        )}

        {isError && <ErrorState message="Failed to load SOS events." onRetry={refetch} />}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState label="No SOS events found" note="Try adjusting the date range." />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                  {["S/N", "Date", "Event", "Alerts Sent", "Location", "Action"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rowNum = (page - 1) * perPage + i + 1;
                  const rev = revealed[row.id];
                  const err = revealError[row.id];
                  const isRevealing = revealingId === row.id && revealMut.isPending;

                  return (
                    <Fragment key={row.id}>
                      <tr
                        style={{ borderBottom: rev ? "none" : "1px solid #f9fafb" }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-3 text-xs text-gray-500">{rowNum}.</td>
                        <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">
                          {row.eventName ?? "—"}
                        </td>
                        <td className="py-3 px-3 text-xs text-gray-600">{row.alertsSent}</td>
                        <td className="py-3 px-3">
                          {row.hasLocation ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
                            >
                              <MapPin size={11} /> Has location
                            </span>
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: "#f3f4f6", color: "#6b7280" }}
                            >
                              No location
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {rev ? (
                            <span className="text-xs font-medium" style={{ color: "#16a34a" }}>
                              Revealed
                            </span>
                          ) : (
                            <button
                              disabled={isRevealing}
                              onClick={() => handleReveal(row.id)}
                              className="px-3 py-1 rounded text-xs font-semibold text-white disabled:opacity-50"
                              style={{ backgroundColor: "#dc2626" }}
                            >
                              {isRevealing ? "Revealing…" : "Reveal details"}
                            </button>
                          )}
                        </td>
                      </tr>

                      {err && (
                        <tr key={`${row.id}-error`} style={{ borderBottom: "1px solid #f9fafb" }}>
                          <td colSpan={6} className="px-3 pb-3">
                            <div
                              className="px-3 py-2 rounded-lg text-xs font-medium"
                              style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
                            >
                              {err}
                            </div>
                          </td>
                        </tr>
                      )}

                      {rev && (
                        <tr key={`${row.id}-detail`} style={{ borderBottom: "1px solid #f9fafb" }}>
                          <td colSpan={6} className="px-3 pb-4">
                            <div
                              className="rounded-lg p-4 flex flex-col gap-2"
                              style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                                <div>
                                  <span className="text-xs text-gray-500">Name: </span>
                                  <span className="text-xs font-semibold text-gray-800">
                                    {rev.data.user.displayName ?? "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500">Email: </span>
                                  <span className="text-xs font-semibold text-gray-800">
                                    {rev.data.user.email}
                                  </span>
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="text-xs text-gray-500">Location: </span>
                                  <span className="text-xs font-semibold text-gray-800">
                                    {rev.data.latitude != null && rev.data.longitude != null
                                      ? `${rev.data.latitude.toFixed(6)}, ${rev.data.longitude.toFixed(6)}`
                                      : "Not shared"}
                                  </span>
                                </div>
                                {rev.data.note && (
                                  <div className="sm:col-span-2">
                                    <span className="text-xs text-gray-500">Note: </span>
                                    <span className="text-xs text-gray-800">{rev.data.note}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 pt-1" style={{ borderTop: "1px solid #fecaca" }}>
                                Revealed by {rev.revealedByName} at {formatTime(rev.revealedAt)}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / pagination — same layout as the other admin list screens. */}
        {!isLoading && !isError && meta && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-500">
              {meta.total > 0
                ? `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, meta.total)} of ${meta.total} entries`
                : "No entries"}
            </p>
            {meta.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 rounded text-xs font-medium border disabled:opacity-40"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => i + 1).map((p) => (
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
                  onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                  disabled={page === meta.totalPages}
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

      <footer className="flex items-center justify-between text-xs text-gray-400 pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
