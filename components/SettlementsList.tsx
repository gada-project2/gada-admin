"use client";

import { useRouter } from "next/navigation";
import { Landmark, HandCoins } from "lucide-react";
import {
  adminControllerListSettlements,
  getAdminControllerListSettlementsQueryKey,
  useAdminControllerStats,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListSettlementsParams } from "@/lib/api/generated/model/adminControllerListSettlementsParams";
import type {
  Settlement,
  SettlementListResponse,
  SettlementStatus,
  DashboardStats,
} from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";
import StatCard from "@/components/StatCard";
import { formatNaira } from "@/lib/utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

const STATUS_OPTIONS = ["All", "HELD", "RELEASED", "FAILED"];

const STATUS_STYLE: Record<SettlementStatus, string> = {
  HELD: "bg-amber-100 text-amber-700",
  RELEASED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: SettlementStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
// GET /v1/admin/settlements — read-only, backed by EventPayout. Visible to all
// admins: this is oversight into money movement, not a money-movement action
// or a security log, so unlike Action Log it is NOT super-admin-gated.

export default function SettlementsList() {
  const router = useRouter();

  const { data: statsRaw } = useAdminControllerStats();
  const stats = statsRaw as unknown as DashboardStats | undefined;

  const { rows, meta, isLoading, isError, refetch, page, setPage, params, setParam } =
    useTableQuery<Settlement, AdminControllerListSettlementsParams>({
      fetchFn: adminControllerListSettlements,
      queryKey: getAdminControllerListSettlementsQueryKey,
      mapParams: ({ page, perPage, extras }) => ({
        page: String(page),
        perPage: String(perPage),
        status: extras.status ?? "",
        dateFrom: extras.dateFrom ?? "",
        dateTo: extras.dateTo ?? "",
      }),
      extractRows: (data) => (data as SettlementListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as SettlementListResponse | undefined)?.meta,
      perPage: 10,
      extraParamKeys: ["status", "dateFrom", "dateTo"],
    });

  const perPage = meta?.perPage ?? 10;

  const columns: Column<Settlement>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${(page - 1) * perPage + i + 1}.`,
    },
    { key: "event", header: "Event", render: (row) => row.event?.name ?? "—" },
    { key: "convener", header: "Convener", render: (row) => row.convener?.name ?? "—" },
    { key: "amountKobo", header: "Amount", render: (row) => formatNaira(row.amountKobo) },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "releasedAt", header: "Released", render: (row) => formatDate(row.releasedAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Pending Disbursement"
          value={formatNaira(stats?.totalHeldKobo)}
          icon={<Landmark size={20} />}
        />
        <StatCard
          label="Total Disbursed"
          value={formatNaira(stats?.totalReleasedKobo)}
          icon={<HandCoins size={20} />}
        />
      </div>

      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h2 className="text-base font-bold text-gada-dark">Settlements</h2>
          <p className="text-xs text-gada-text-muted mt-0.5">
            Per-event payouts to conveners — click a row to see the contributing transactions.
          </p>
        </div>

        {/* Filters — same URL-driven pattern as the other admin list screens. */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="settlement-status" className="text-xs text-gada-text-muted font-medium">
              Status:
            </label>
            <select
              id="settlement-status"
              value={params.status ?? ""}
              onChange={(e) => setParam("status", e.target.value === "All" ? "" : e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
              style={{ minWidth: 140 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s === "All" ? "" : s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settlement-from" className="text-xs text-gada-text-muted font-medium">
              From:
            </label>
            <input
              id="settlement-from"
              type="date"
              value={params.dateFrom ?? ""}
              onChange={(e) => setParam("dateFrom", e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="settlement-to" className="text-xs text-gada-text-muted font-medium">
              To:
            </label>
            <input
              id="settlement-to"
              type="date"
              value={params.dateTo ?? ""}
              onChange={(e) => setParam("dateTo", e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyLabel="No settlements found"
          emptyNote="No event payouts have been recorded yet."
          onRowClick={(row) => router.push(`/dashboard/settlements/${row.id}`)}
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
