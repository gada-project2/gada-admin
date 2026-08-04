"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminControllerListDisputes,
  getAdminControllerListDisputesQueryKey,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListDisputesParams } from "@/lib/api/generated/model/adminControllerListDisputesParams";
import type { DisputeListRow, DisputeListResponse, DisputeStatus } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

const STATUS_OPTIONS = ["All", "OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"];
const TYPE_OPTIONS = ["All", "PURCHASE", "PAYOUT", "VENDOR_BOOTH", "GENERAL"];

const STATUS_STYLE: Record<DisputeStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: DisputeStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{titleCase(status)}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
// GET /v1/admin/disputes — filters: status, type, dateFrom, dateTo (queue only
// exposes status + type per spec; date range is available on the endpoint but
// not surfaced here). Verified against source (AdminService.listDisputes)
// 2026-08-04.

export default function DisputesList() {
  const router = useRouter();

  const { rows, meta, isLoading, isError, refetch, page, setPage, params, setParam } =
    useTableQuery<DisputeListRow, AdminControllerListDisputesParams>({
      fetchFn: adminControllerListDisputes,
      queryKey: getAdminControllerListDisputesQueryKey,
      mapParams: ({ page, perPage, extras }) => ({
        page: String(page),
        perPage: String(perPage),
        status: extras.status ?? "",
        type: extras.type ?? "",
        dateFrom: "",
        dateTo: "",
      }),
      extractRows: (data) => (data as DisputeListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as DisputeListResponse | undefined)?.meta,
      perPage: 10,
      extraParamKeys: ["status", "type"],
    });

  const columns: Column<DisputeListRow>[] = [
    { key: "subject", header: "Subject", render: (row) => <span className="font-medium">{row.subject}</span> },
    {
      key: "filedBy",
      header: "Filed By",
      render: (row) =>
        row.filedBy ? (
          <Link href={`/dashboard/users/${row.filedBy.id}`} className="hover:underline" style={{ color: "#f59e0b" }}>
            {row.filedBy.displayName ?? row.filedBy.email}
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "type", header: "Type", render: (row) => titleCase(row.type) },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "updatedAt", header: "Last Activity", render: (row) => formatDate(row.updatedAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h2 className="text-base font-bold text-gada-dark">Disputes</h2>
          <p className="text-xs text-gada-text-muted mt-0.5">
            User-filed disputes over purchases, payouts, and vendor booths — click a row to review and respond.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="dispute-status" className="text-xs text-gada-text-muted font-medium">
              Status:
            </label>
            <select
              id="dispute-status"
              value={params.status ?? ""}
              onChange={(e) => setParam("status", e.target.value === "All" ? "" : e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
              style={{ minWidth: 150 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s === "All" ? "" : s}>
                  {s === "All" ? "All" : titleCase(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dispute-type" className="text-xs text-gada-text-muted font-medium">
              Type:
            </label>
            <select
              id="dispute-type"
              value={params.type ?? ""}
              onChange={(e) => setParam("type", e.target.value === "All" ? "" : e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
              style={{ minWidth: 140 }}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t === "All" ? "" : t}>
                  {t === "All" ? "All" : titleCase(t)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyLabel="No disputes found"
          emptyNote="Try adjusting the filters."
          onRowClick={(row) => router.push(`/dashboard/disputes/${row.id}`)}
          meta={meta}
          page={page}
          onPageChange={setPage}
        />
      </div>

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
