"use client";

import StatCard from "@/components/StatCard";
import RevenueChart from "@/components/RevenueChart";
import TopConvenersByRevenue from "@/components/TopConvenersByRevenue";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import { useAdminControllerStats } from "@/lib/api/generated/admin/admin";
import type { DashboardStats } from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";

const RevenueIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </svg>
);

export default function RevenuePage() {
  const { data: raw, isLoading, isError, refetch } = useAdminControllerStats();
  const stats = raw as unknown as DashboardStats | undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Top KPI.
          Labeled precisely: this is gross ticket revenue net of refunds, NOT
          platform earnings — the platform's actual take is ~5% of this figure
          (see PLATFORM_FEE_PERCENT), which no admin endpoint currently exposes. */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Spinner size={28} />
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load revenue stats." onRetry={refetch} />
        </div>
      )}

      {!isLoading && !isError && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Gross Ticket Revenue (net of refunds, all time)"
            value={formatNaira(stats.totalRevenue)}
            icon={RevenueIcon}
          />
        </div>
      )}

      {/* Revenue trend */}
      <RevenueChart />

      {/* Top conveners by revenue */}
      <TopConvenersByRevenue />

      {/*
        Deliberately NOT built: a "Top Events by Revenue" table.

        Event.totalRevenue is the denormalized column we just fixed to stop
        drifting on refund (see the earlier refund-audit fast-follow). Going
        forward it should stay correct — but the backfill only proved it
        matches the live-computed total AT THE MOMENT it ran, not that the
        column is trustworthy as a general-purpose ranked-list source. The
        conveners list above sidesteps this entirely by computing totalRevenue
        live from payments (the same approach listConveners already used
        before this task), which is the right basis for a user-facing ranking.

        Fast follow: switch a per-event revenue table to the same live
        aggregate (or add a dedicated admin endpoint that does it) rather than
        reading Event.totalRevenue directly, then build this section.
      */}

      <footer className="flex items-center justify-between text-xs text-gray-400 pt-2 pb-1">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
