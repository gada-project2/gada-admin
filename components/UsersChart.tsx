"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAdminControllerChartUsers } from "@/lib/api/generated/admin/admin";
import type { UserGrowthChartData } from "@/lib/api/types/admin";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

// GET /v1/admin/dashboard/chart/users returns a daily signup count
// ({ date, count }[]). The old per-month users/vendors/conveners breakdown does
// not exist on this API — a single "new users per day" series is what's real.

const RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${d.toLocaleString("en", { month: "short", timeZone: "UTC" })}`;
}

export default function UsersChart() {
  const [days, setDays] = useState("30");

  const { data: raw, isLoading, isError, refetch } =
    useAdminControllerChartUsers({ days });

  const points = raw as unknown as UserGrowthChartData | undefined;

  const chartData = points?.map((p) => ({
    date: shortDate(p.date),
    users: p.count,
  }));

  const total = points?.reduce((sum, p) => sum + p.count, 0) ?? 0;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-gray-800">New Users</h2>
        <select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-xs text-gray-600 bg-white"
          style={{ borderColor: "#e5e7eb" }}
          aria-label="Chart date range"
        >
          {RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center" style={{ height: 260 }}>
          <Spinner size={28} />
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load user chart." onRetry={refetch} />
      )}

      {!isLoading && !isError && chartData && (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="users"
                name="New users"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="pt-2" style={{ borderTop: "1px solid #f3f4f6" }}>
            <p className="text-sm font-semibold text-gray-700">
              {total.toLocaleString()} new user{total === 1 ? "" : "s"} in this period
            </p>
          </div>
        </>
      )}
    </div>
  );
}
