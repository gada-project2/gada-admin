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
import { useAdminControllerChartRevenue } from "@/lib/api/generated/admin/admin";
import type { RevenueChartData } from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

// GET /v1/admin/dashboard/chart/revenue — daily net-of-refund revenue,
// timezone-correct (Africa/Lagos day boundaries), zero-filled for empty days.

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

export default function RevenueChart() {
  const [days, setDays] = useState("30");

  const { data: raw, isLoading, isError, refetch } =
    useAdminControllerChartRevenue({ days });

  const points = raw as unknown as RevenueChartData | undefined;

  const chartData = points?.map((p) => ({
    date: shortDate(p.date),
    revenueKobo: p.revenueKobo,
  }));

  const total = points?.reduce((sum, p) => sum + p.revenueKobo, 0) ?? 0;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-800">Revenue Trend</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Gross ticket revenue, net of refunds
          </p>
        </div>
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
        <div className="flex items-center justify-center" style={{ height: 220 }}>
          <Spinner size={28} />
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load revenue chart." onRetry={refetch} />
      )}

      {!isLoading && !isError && chartData && (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `₦${(v / 100).toLocaleString()}`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                formatter={(value) => [formatNaira(Number(value)), "Revenue"]}
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="revenueKobo"
                name="Revenue"
                stroke="#16a34a"
                fill="#16a34a"
                fillOpacity={0.08}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="pt-2" style={{ borderTop: "1px solid #f3f4f6" }}>
            <p className="text-sm font-semibold text-gray-700">
              {formatNaira(total)} in this period
            </p>
          </div>
        </>
      )}
    </div>
  );
}
