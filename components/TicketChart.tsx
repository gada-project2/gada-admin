"use client";

import EmptyState from "@/components/ui/EmptyState";

export default function TicketChart() {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2"
      style={{ backgroundColor: "#ffffff" }}
    >
      <h2 className="text-base font-bold text-gray-800 mb-2">Ticket Chart</h2>
      <EmptyState
        label="No data source yet"
        note="A ticket breakdown endpoint has not been implemented. Request GET /v1/admin/dashboard/chart/tickets to populate this chart."
      />
    </div>
  );
}
