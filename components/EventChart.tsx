"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAdminControllerChartEvents } from "@/lib/api/generated/admin/admin";
import type { EventChartData } from "@/lib/api/types/admin";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

// GET /v1/admin/dashboard/chart/events returns a daily time series
// ({ date, count }[]), NOT the active/past/upcoming aggregate the old dev API
// returned — so this is a trend chart, not a pie chart.

const RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

function shortDate(iso: string): string {
  // "2026-07-14" → "14 Jul"
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${d.toLocaleString("en", { month: "short", timeZone: "UTC" })}`;
}

export default function EventChart() {
  const [days, setDays] = useState("30");

  const { data: raw, isLoading, isError, refetch } =
    useAdminControllerChartEvents({ days });

  const points = raw as unknown as EventChartData | undefined;

  const chartData = points?.map((p) => ({
    date: shortDate(p.date),
    events: p.count,
  }));

  const total = points?.reduce((sum, p) => sum + p.count, 0) ?? 0;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-gray-800">Events Created</h2>
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
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <Spinner size={28} />
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load event chart." onRetry={refetch} />
      )}

      {!isLoading && !isError && chartData && (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
              <Area
                type="monotone"
                dataKey="events"
                name="Events"
                stroke="#1a1a1a"
                fill="#1a1a1a"
                fillOpacity={0.08}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="pt-2" style={{ borderTop: "1px solid #f3f4f6" }}>
            <p className="text-sm font-semibold text-gray-700">
              {total.toLocaleString()} event{total === 1 ? "" : "s"} created in this period
            </p>
          </div>
        </>
      )}
    </div>
  );
}
