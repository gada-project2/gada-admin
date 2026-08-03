"use client";

import EmptyState from "@/components/ui/EmptyState";

export default function TicketChart() {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2"
      style={{ backgroundColor: "#ffffff" }}
    >
      <h2 className="text-base font-bold text-gray-800 mb-2">Ticket Chart</h2>
      {/* GET /v1/admin/dashboard/chart/tickets now EXISTS on the API and returns
          [{ date, tickets, revenueKobo, revenueNaira }]. Wiring it up is a
          follow-up task — this pass was scoped to reconnecting existing screens. */}
      <EmptyState
        label="Not wired up yet"
        note="GET /v1/admin/dashboard/chart/tickets is available on the API and returns a daily tickets/revenue series. This chart still needs to be built against it."
      />
    </div>
  );
}
