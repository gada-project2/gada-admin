"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAdminControllerGetSettlement } from "@/lib/api/generated/admin/admin";
import type { SettlementDetail, SettlementStatus, SettlementTransaction } from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
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

const STATUS_STYLE: Record<SettlementStatus, string> = {
  HELD: "bg-amber-100 text-amber-700",
  RELEASED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: SettlementStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

export default function SettlementDetailView({ id }: Props) {
  const { data: raw, isLoading, isError, refetch } = useAdminControllerGetSettlement(id);
  const settlement = raw as unknown as SettlementDetail | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !settlement) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/settlements"
          className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Settlements
        </Link>
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load settlement details." onRetry={refetch} />
        </div>
      </div>
    );
  }

  const settlementInfo = [
    { label: "Event", value: settlement.event?.name ?? "—" },
    { label: "Convener", value: settlement.convener?.name ?? "—" },
    { label: "Convener Email", value: settlement.convener?.email ?? "—" },
    { label: "Amount", value: formatNaira(settlement.amountKobo) },
    { label: "Status", value: <StatusBadge status={settlement.status} /> },
    { label: "Released", value: formatDate(settlement.releasedAt) },
    { label: "Paystack Transfer Code", value: settlement.paystackTransferCode ?? "—" },
    { label: "Created", value: formatDate(settlement.createdAt) },
  ];

  const perPage = settlement.transactions.length || 1;

  const txColumns: Column<SettlementTransaction>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${i + 1}.`,
    },
    { key: "buyerName", header: "Buyer" },
    { key: "amountKobo", header: "Amount", render: (row) => formatNaira(row.amountKobo) },
    { key: "netKobo", header: "Net", render: (row) => formatNaira(row.netKobo) },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Date", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/settlements"
        className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Back to Settlements
      </Link>

      <div className="rounded-xl p-5 bg-white">
        <h2 className="text-base font-bold text-gada-dark mb-4">Settlement Info</h2>
        <div className="border rounded-xl overflow-hidden border-gada-border-light">
          {settlementInfo.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-2"
              style={{ borderBottom: i < settlementInfo.length - 1 ? "1px solid #f3f4f6" : "none" }}
            >
              <div className="px-4 py-3 text-sm text-gada-text-muted font-medium border-r border-gada-border-light">
                {row.label}
              </div>
              <div className="px-4 py-3 text-sm font-semibold text-gada-dark">{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h2 className="text-base font-bold text-gada-dark">Contributing Transactions</h2>
          <p className="text-xs text-gada-text-muted mt-0.5">
            Payments that funded this settlement&apos;s event, net of refunds.
          </p>
        </div>

        <DataTable
          columns={txColumns}
          rows={settlement.transactions}
          isLoading={false}
          isError={false}
          onRetry={refetch}
          emptyLabel="No transactions found"
          emptyNote="No payments have contributed to this settlement."
          meta={{ page: 1, perPage, total: settlement.transactions.length, totalPages: 1 }}
          page={1}
          onPageChange={() => {}}
        />
      </div>

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
