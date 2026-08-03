"use client";

import StatCard from "@/components/StatCard";
import EventChart from "@/components/EventChart";
import CalendarWidget from "@/components/CalendarWidget";
import UsersChart from "@/components/UsersChart";
import TicketChart from "@/components/TicketChart";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import { useAdminControllerStats } from "@/lib/api/generated/admin/admin";
import type { DashboardStats } from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";

// ─── Stat card icon helpers (unchanged SVGs) ──────────────────────────────────

const UsersIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const ConvenerIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="8" r="4" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);
const VendorIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const CalIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const CheckCalIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M9 16l2 2 4-4" />
  </svg>
);
const TicketIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" />
  </svg>
);

export default function DashboardPage() {
  const { data: raw, isLoading, isError, refetch } = useAdminControllerStats();

  const stats = raw as unknown as DashboardStats | undefined;

  // ─── Stat card definitions ───────────────────────────────────────────────────
  // Every card below maps to a real field on GET /v1/admin/dashboard/stats.
  // The old "—" placeholder cards (Paid/Free Events, Total/Available Tickets,
  // Total Conveners) were removed: this API exposes no such counters.
  const statCards = stats
    ? [
        { label: "Total Users",       value: stats.totalUsers,        icon: UsersIcon },
        { label: "Total Events",      value: stats.totalEvents,       icon: CalIcon },
        { label: "Published Events",  value: stats.publishedEvents,   icon: CheckCalIcon },
        { label: "Active Vendors",    value: stats.activeVendors,     icon: VendorIcon },
        { label: "Revenue",           value: formatNaira(stats.totalRevenue), icon: TicketIcon },
        { label: "Pending Volunteers", value: stats.pendingVolunteers, icon: ConvenerIcon },
        { label: "Checked In Today",  value: stats.checkedInToday,    icon: TicketIcon },
        { label: "New Users Today",   value: stats.newUsersToday,     icon: UsersIcon },
        { label: "New Events Today",  value: stats.newEventsToday,    icon: CalIcon },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Stats Grid */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Spinner size={28} />
        </div>
      )}

      {isError && (
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load dashboard stats." onRetry={refetch} />
        </div>
      )}

      {!isLoading && !isError && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </div>
      )}

      {/* Charts Row 1: Event Chart + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventChart />
        <CalendarWidget />
      </div>

      {/* Charts Row 2: Users Count + Ticket Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UsersChart />
        <TicketChart />
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between text-xs text-gray-400 pt-2 pb-1">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
