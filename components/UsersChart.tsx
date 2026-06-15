"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAdminControllerGetUserGrowthChart } from "@/lib/api/generated/admin/admin";
import type { UserGrowthDataPoint } from "@/lib/api/types/admin";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

const MONTH_LABELS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export default function UsersChart() {
  const { data: raw, isLoading, isError, refetch } =
    useAdminControllerGetUserGrowthChart();

  const points = raw as unknown as UserGrowthDataPoint[] | undefined;

  const chartData = points?.map((p) => ({
    month: MONTH_LABELS[p.month - 1] ?? String(p.month),
    users: p.users,
    vendors: p.vendors,
    conveners: p.conveners,
  }));

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: "#ffffff" }}
    >
      <h2 className="text-base font-bold text-gray-800">Total Users Count</h2>

      {isLoading && (
        <div className="flex items-center justify-center" style={{ height: 260 }}>
          <Spinner size={28} />
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load user chart." onRetry={refetch} />
      )}

      {!isLoading && !isError && chartData && (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "User Count",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 11, fill: "#9ca3af" },
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />
            <Legend
              iconType="line"
              wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
            />
            <Line
              type="monotone"
              dataKey="users"
              name="Users"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="vendors"
              name="Vendors"
              stroke="#9ca3af"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="conveners"
              name="Conveners"
              stroke="#1a1a1a"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
