"use client";

import {
  adminControllerGetTickets,
  getAdminControllerGetTicketsQueryKey,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerGetTicketsParams } from "@/lib/api/generated/model/adminControllerGetTicketsParams";
import type { TicketPurchase, TicketListResponse } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { formatNaira } from "@/lib/utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

function CheckInBadge({ checkedIn }: { checkedIn?: boolean }) {
  if (checkedIn === undefined || checkedIn === null) return <span className="text-gada-text-muted">—</span>;
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        checkedIn ? "bg-green-100 text-green-700" : "bg-gada-surface-card text-gada-text-secondary"
      }`}
    >
      {checkedIn ? "Checked in" : "Not checked in"}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
// READ-ONLY: No ticket mutations exist in the admin spec.

export default function TicketsList() {
  // ── Table query ───────────────────────────────────────────────────────────────
  // Confirmed params: search ✅, startDate/endDate ✅; status → 500 (not exposed).
  const {
    rows,
    meta,
    isLoading,
    isError,
    refetch,
    search,
    setSearch,
    page,
    setPage,
    params,
    setParam,
  } = useTableQuery<TicketPurchase, AdminControllerGetTicketsParams>({
    fetchFn: adminControllerGetTickets,
    queryKey: getAdminControllerGetTicketsQueryKey,
    mapParams: ({ page, perPage, search, extras }) => ({
      page,
      perPage,
      ...(search ? { search } : {}),
      ...(extras.startDate ? { startDate: extras.startDate } : {}),
      ...(extras.endDate ? { endDate: extras.endDate } : {}),
    }),
    extractRows: (data) => (data as TicketListResponse | undefined)?.data ?? [],
    extractMeta: (data) => (data as TicketListResponse | undefined)?.meta,
    perPage: 10,
    extraParamKeys: ["startDate", "endDate"],
  });

  // ── Column definitions ─────────────────────────────────────────────────────
  const perPage = meta?.perPage ?? 10;

  const columns: Column<TicketPurchase>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${(page - 1) * perPage + i + 1}.`,
    },
    {
      key: "buyerName",
      header: "Ticket Holder",
      render: (row) => row.buyerName ?? "—",
    },
    {
      key: "buyerEmail",
      header: "Email",
      render: (row) => row.buyerEmail ?? "—",
    },
    {
      key: "eventTitle",
      header: "Event",
      render: (row) => row.eventTitle ?? "—",
    },
    {
      key: "ticketName",
      header: "Ticket Tier",
      render: (row) => row.ticketName ?? row.ticketType ?? "—",
    },
    {
      key: "price",
      header: "Amount",
      render: (row) => formatNaira(row.price),
    },
    {
      key: "paymentProvider",
      header: "Provider",
      render: (row) => row.paymentProvider ?? "—",
    },
    {
      key: "checkedIn",
      header: "Check-in",
      render: (row) => <CheckInBadge checkedIn={row.checkedIn} />,
    },
    {
      key: "createdAt",
      header: "Purchase Date",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  // ── Filter controls (search + date range) ────────────────────────────────────
  const filters = (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gada-text-muted font-medium">From:</label>
        <input
          type="date"
          value={params.startDate ?? ""}
          onChange={(e) => setParam("startDate", e.target.value)}
          className="border border-gada-border-light rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gada-text-muted font-medium">To:</label>
        <input
          type="date"
          value={params.endDate ?? ""}
          onChange={(e) => setParam("endDate", e.target.value)}
          className="border border-gada-border-light rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none"
        />
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <label className="text-xs text-gada-text-muted font-medium">Search:</label>
        <div className="flex items-center border border-gada-border-light rounded-lg px-3 py-2 gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by holder name or event"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-xs text-gada-text-secondary outline-none bg-transparent"
          />
        </div>
      </div>
    </>
  );

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
          emptyNote="Try adjusting your search or date range."
          filters={filters}
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
