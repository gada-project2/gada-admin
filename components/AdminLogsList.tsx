"use client";

import Link from "next/link";
import { useAdmin } from "@/lib/hooks/useAdmin";
import {
  adminControllerListAdminLogs,
  getAdminControllerListAdminLogsQueryKey,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListAdminLogsParams } from "@/lib/api/generated/model/adminControllerListAdminLogsParams";
import { ADMIN_LOG_ACTIONS, type AdminLogRow, type AdminLogListResponse } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

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

const ACTION_LABELS: Record<string, string> = {
  ADMIN_CREATED: "Admin Created",
  ADMIN_DELETED: "Admin Deleted",
  EVENT_DELETED: "Event Deleted",
  EVENT_SUSPENDED: "Event Suspended",
  REFUND_PURCHASE: "Refund Issued",
  SOS_REVEALED: "SOS Revealed",
  USER_DELETED: "User Deleted",
  USER_RESTORED: "User Restored",
  USER_SUSPENDED: "User Suspended",
  VENDOR_RESTORED: "Vendor Restored",
  VENDOR_SUSPENDED: "Vendor Suspended",
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  REFUND_PURCHASE: { bg: "#fef9c3", color: "#ca8a04" },
  SOS_REVEALED: { bg: "#fee2e2", color: "#dc2626" },
  EVENT_DELETED: { bg: "#fee2e2", color: "#dc2626" },
  USER_DELETED: { bg: "#fee2e2", color: "#dc2626" },
  ADMIN_DELETED: { bg: "#fee2e2", color: "#dc2626" },
  EVENT_SUSPENDED: { bg: "#ffedd5", color: "#c2410c" },
  USER_SUSPENDED: { bg: "#ffedd5", color: "#c2410c" },
  VENDOR_SUSPENDED: { bg: "#ffedd5", color: "#c2410c" },
  USER_RESTORED: { bg: "#dcfce7", color: "#16a34a" },
  VENDOR_RESTORED: { bg: "#dcfce7", color: "#16a34a" },
  ADMIN_CREATED: { bg: "#dbeafe", color: "#2563eb" },
};

function ActionBadge({ action }: { action: string }) {
  const colors = ACTION_COLORS[action] ?? { bg: "#f3f4f6", color: "#4b5563" };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: colors.bg, color: colors.color }}
    >
      {ACTION_LABELS[action] ?? action}
    </span>
  );
}

// Only Event has a real per-id detail route in this app today
// (app/dashboard/event-moderation/[id]). Purchase, User, Vendor, Admin and
// SafetyEvent have no detail page to link to — those render as plain text
// rather than a link that would 404.
function TargetCell({ targetType, targetId }: { targetType: string | null; targetId: string | null }) {
  if (!targetType || !targetId) return <span className="text-gray-400">—</span>;

  if (targetType === "Event") {
    return (
      <Link
        href={`/dashboard/event-moderation/${targetId}`}
        className="text-xs font-medium hover:underline"
        style={{ color: "#f59e0b" }}
      >
        {targetType} · {targetId.slice(0, 10)}…
      </Link>
    );
  }

  return (
    <span className="text-xs text-gray-600 whitespace-nowrap">
      {targetType} · {targetId.slice(0, 10)}…
    </span>
  );
}

function LogsTable() {
  const { rows, meta, isLoading, isError, refetch, page, setPage, params, setParam } =
    useTableQuery<AdminLogRow, AdminControllerListAdminLogsParams>({
      fetchFn: adminControllerListAdminLogs,
      queryKey: getAdminControllerListAdminLogsQueryKey,
      mapParams: ({ page, perPage, extras }) => ({
        page: String(page),
        perPage: String(perPage),
        action: extras.action ?? "",
        adminId: "",
        dateFrom: extras.dateFrom ?? "",
        dateTo: extras.dateTo ?? "",
      }),
      extractRows: (data) => (data as AdminLogListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as AdminLogListResponse | undefined)?.meta,
      perPage: 20,
      extraParamKeys: ["action", "dateFrom", "dateTo"],
    });

  const perPage = meta?.perPage ?? 20;

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#ffffff" }}>
      <div>
        <h2 className="text-base font-bold text-gray-800">Admin Action Log</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Every moderation and money-moving action taken by an admin, audited unconditionally.
        </p>
      </div>

      {/* Filters — same URL-driven pattern as the other admin list screens. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="log-action" className="text-xs text-gray-500 font-medium">
            Action:
          </label>
          <select
            id="log-action"
            value={params.action ?? ""}
            onChange={(e) => setParam("action", e.target.value)}
            className="border rounded-lg px-3 py-2 text-xs text-gray-600 outline-none"
            style={{ borderColor: "#e5e7eb", minWidth: 160 }}
          >
            <option value="">All actions</option>
            {ADMIN_LOG_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="log-from" className="text-xs text-gray-500 font-medium">
            From:
          </label>
          <input
            id="log-from"
            type="date"
            value={params.dateFrom ?? ""}
            onChange={(e) => setParam("dateFrom", e.target.value)}
            className="border rounded-lg px-3 py-2 text-xs text-gray-600 outline-none"
            style={{ borderColor: "#e5e7eb" }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="log-to" className="text-xs text-gray-500 font-medium">
            To:
          </label>
          <input
            id="log-to"
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

      {isError && <ErrorState message="Failed to load the action log." onRetry={refetch} />}

      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState label="No actions found" note="Try adjusting the filters." />
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                {["Time", "Admin", "Action", "Target", "Reason"].map((h) => (
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
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f9fafb" }} className="hover:bg-gray-50">
                  <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-700 whitespace-nowrap">
                    {row.admin ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{row.admin.name}</span>
                        <span className="text-gray-400">{row.admin.email}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Deleted admin ({row.adminId.slice(0, 10)}…)</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <ActionBadge action={row.action} />
                  </td>
                  <td className="py-3 px-3">
                    <TargetCell targetType={row.targetType} targetId={row.targetId} />
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-600 max-w-xs truncate" title={row.reason ?? undefined}>
                    {row.reason ?? <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Access gate.
//
// The sidebar hides this route entirely for non-super admins (see
// components/Sidebar.tsx), so reaching this component with a non-super session
// means someone typed the URL directly. The backend's own guard
// (AdminService.requireSuper) rejects with 403 {code:'SUPER_ADMIN_ONLY'} — this
// renders that as a clear message instead of letting a raw error/stack surface.
// It does NOT gate on the client alone: the 403 is real and enforced server-side
// regardless of what this component does.
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminLogsList() {
  const { admin, isLoading: adminLoading } = useAdmin();

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  if (!admin?.isSuperAdmin) {
    return (
      <div className="rounded-xl p-8 bg-white flex flex-col items-center text-center gap-2">
        <h2 className="text-base font-bold text-gray-800">Super admin access required</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          The admin action log is only visible to super admins. Ask a super admin
          on your team if you need to review it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <LogsTable />
      <footer className="flex items-center justify-between text-xs text-gray-400 pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
