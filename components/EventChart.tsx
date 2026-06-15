"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";
import { useAdminControllerGetEventChartData } from "@/lib/api/generated/admin/admin";
import type { EventChartData } from "@/lib/api/types/admin";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

const COLORS = ["#1a1a1a", "#d1d5db", "#6b7280"];

export default function EventChart() {
  const { data: raw, isLoading, isError, refetch } =
    useAdminControllerGetEventChartData();

  const chart = raw as unknown as EventChartData | undefined;

  const pieData = chart
    ? [
        { name: "Active Events",   value: chart.active,   color: COLORS[0] },
        { name: "Past Events",     value: chart.past,     color: COLORS[1] },
        { name: "Upcoming Events", value: chart.upcoming, color: COLORS[2] },
      ]
    : [];

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-gray-800">Event Chart</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Filter By:</span>
          <div
            className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs text-gray-600 cursor-pointer"
            style={{ borderColor: "#e5e7eb", minWidth: 120 }}
          >
            <span>Free Events</span>
            <ChevronDown size={12} />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center" style={{ height: 200 }}>
          <Spinner size={28} />
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load event chart." onRetry={refetch} />
      )}

      {!isLoading && !isError && chart && (
        <div className="flex items-center gap-6">
          <div style={{ width: 200, height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={90}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-3">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-sm shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
            <div className="mt-2 pt-2" style={{ borderTop: "1px solid #f3f4f6" }}>
              <p className="text-sm font-semibold text-gray-700">
                Total Events – {chart.total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
