"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  useAdminControllerGetConvener,
  useAdminControllerListEvents,
} from "@/lib/api/generated/admin/admin";
import type { Convener, AdminEventsListResponse, AdminEventSummary, AdminEventStatus } from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
import { keyToUrl } from "@/lib/utils/media";
import Avatar from "@/components/ui/Avatar";
import StatCard from "@/components/StatCard";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import DataTable, { type Column } from "@/components/ui/DataTable";

interface Props {
  id: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

// Same status → color mapping as EventModerationList's statusStyle, reused
// here so an event's badge looks identical whether seen from that screen or
// from a convener's event list.
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PUBLISHED: { bg: "#dcfce7", color: "#16a34a", label: "Published" },
  DRAFT: { bg: "#f3f4f6", color: "#4b5563", label: "Draft" },
  CANCELLED: { bg: "#fee2e2", color: "#dc2626", label: "Cancelled" },
  SUSPENDED: { bg: "#ffedd5", color: "#c2410c", label: "Suspended" },
  COMPLETED: { bg: "#e0e7ff", color: "#4338ca", label: "Completed" },
};

function StatusBadge({ status }: { status: AdminEventStatus }) {
  const s = STATUS_STYLE[status] ?? { bg: "#f3f4f6", color: "#4b5563", label: status };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

const EventsIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const RevenueIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" />
  </svg>
);

export default function ConvenerDetailView({ id }: Props) {
  const [eventsPage, setEventsPage] = useState(1);

  const { data: raw, isLoading, isError, refetch } = useAdminControllerGetConvener(id);
  const convener = raw as unknown as Convener | undefined;

  // Scoped by convenerId — NOT the full unfiltered events list. GET
  // /v1/admin/events accepts a convenerId filter (verified against source,
  // AdminService.listEvents).
  const { data: eventsRaw, isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } =
    useAdminControllerListEvents({
      page: String(eventsPage),
      perPage: "10",
      status: "",
      search: "",
      convenerId: id,
    });
  const eventsResp = eventsRaw as unknown as AdminEventsListResponse | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !convener) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/conveners"
          className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Conveners
        </Link>
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load convener details." onRetry={refetch} />
        </div>
      </div>
    );
  }

  const eventColumns: Column<AdminEventSummary>[] = [
    {
      key: "name",
      header: "Event",
      render: (row) => (
        <Link
          href={`/dashboard/event-moderation/${row.id}`}
          className="text-sm font-medium hover:underline"
          style={{ color: "#f59e0b" }}
        >
          {row.name}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "startDate", header: "Date", render: (row) => formatDate(row.startDate) },
    { key: "ticketsSold", header: "Tickets Sold", render: (row) => row.ticketsSold.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/conveners"
        className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Back to Conveners
      </Link>

      {/* Header */}
      <div className="rounded-xl p-5 bg-white flex items-center gap-4 flex-wrap">
        <Avatar url={keyToUrl(convener.photoKey)} name={convener.displayName} size={56} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gada-dark truncate">{convener.displayName}</h2>
          <p className="text-sm text-gada-text-muted truncate">{convener.email}</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Events Hosted" value={convener.eventCount} icon={EventsIcon} />
        <StatCard
          label="Total Revenue (gross, net of refunds, all time)"
          value={formatNaira(convener.totalRevenue)}
          icon={RevenueIcon}
        />
      </div>

      {/* Events list — scoped to this convener via ?convenerId=, same
          DataTable pattern as the Ticketing/Vendor/Settlement detail screens. */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gada-dark">Events</h3>
          <p className="text-xs text-gada-text-muted mt-0.5">Events hosted by this convener.</p>
        </div>
        <DataTable
          columns={eventColumns}
          rows={eventsResp?.data ?? []}
          isLoading={eventsLoading}
          isError={eventsError}
          onRetry={refetchEvents}
          emptyLabel="No events found"
          emptyNote="This convener has not hosted any events."
          meta={eventsResp?.meta}
          page={eventsPage}
          onPageChange={setEventsPage}
        />
      </div>

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
