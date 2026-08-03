"use client";

import {
  adminControllerListTickets,
  getAdminControllerListTicketsQueryKey,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListTicketsParams } from "@/lib/api/generated/model/adminControllerListTicketsParams";
import type { TicketPurchase, TicketListResponse, TicketStatus } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { formatNaira } from "@/lib/utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED:  "bg-green-100 text-green-700",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  REFUNDED:   "bg-amber-100 text-amber-700",
  CANCELLED:  "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
// READ-ONLY: no ticket mutations exist on the admin API.
//
// GET /v1/admin/tickets accepts page + perPage ONLY. The previous search box and
// From/To date filters called parameters this endpoint does not have, so they
// were removed rather than left as controls that silently do nothing.

export default function TicketsList() {
  const { rows, meta, isLoading, isError, refetch, page, setPage } =
    useTableQuery<TicketPurchase, AdminControllerListTicketsParams>({
      fetchFn: adminControllerListTickets,
      queryKey: getAdminControllerListTicketsQueryKey,
      mapParams: ({ page, perPage }) => ({
        page: String(page),
        perPage: String(perPage),
      }),
      extractRows: (data) => (data as TicketListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as TicketListResponse | undefined)?.meta,
      perPage: 10,
    });

  // ── Column definitions ─────────────────────────────────────────────────────
  const perPage = meta?.perPage ?? 10;

  const columns: Column<TicketPurchase>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${(page - 1) * perPage + i + 1}.`,
    },
    { key: "eventName", header: "Event" },
    { key: "buyerEmail", header: "Buyer" },
    { key: "tierName", header: "Ticket Tier" },
    {
      key: "amountKobo",
      header: "Amount",
      render: (row) => formatNaira(row.amountKobo),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Purchase Date",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h2 className="text-base font-bold text-gada-dark">Ticketing</h2>
          <p className="text-xs text-gada-text-muted mt-0.5">
            All ticket purchases across events — amounts shown in Naira
          </p>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyLabel="No tickets found"
          emptyNote="No ticket purchases have been recorded yet."
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
