"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminControllerListVendors,
  getAdminControllerListVendorsQueryKey,
  adminControllerSuspendVendor,
  adminControllerRestoreVendor,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListVendorsParams } from "@/lib/api/generated/model/adminControllerListVendorsParams";
import type { Vendor, VendorListResponse, VendorStatus } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Avatar from "@/components/ui/Avatar";
import { vendorImageUrl } from "@/lib/utils/media";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

function StatusBadge({ status }: { status: VendorStatus }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
    >
      {active ? "Active" : "Suspended"}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
//
// The vendor DELETE endpoint no longer exists on the API — the only vendor
// actions are suspend and restore, so the delete button and its confirmation
// dialog were removed. GET /v1/admin/vendors also accepts page + perPage ONLY,
// so the status and search filters were removed too.

export default function VendorsList() {
  const queryClient = useQueryClient();

  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: "suspend" | "restore";
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Table query (URL state + data fetching) ──────────────────────────────────
  const { rows, meta, isLoading, isError, refetch, page, setPage } =
    useTableQuery<Vendor, AdminControllerListVendorsParams>({
      fetchFn: adminControllerListVendors,
      queryKey: getAdminControllerListVendorsQueryKey,
      mapParams: ({ page, perPage }) => ({
        page: String(page),
        perPage: String(perPage),
      }),
      extractRows: (data) => (data as VendorListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as VendorListResponse | undefined)?.meta,
      perPage: 10,
    });

  // ── Mutations (raw useMutation — generated hooks collapse to never for void responses) ──
  // TODO: revert to generated hooks once vendor mutation response schema lands in the OpenAPI spec

  const invalidateVendors = () =>
    queryClient.invalidateQueries({ queryKey: getAdminControllerListVendorsQueryKey() });

  const suspendMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id }: { id: string }) => adminControllerSuspendVendor(id) as any,
    onMutate: ({ id }) => { setPendingAction({ id, action: "suspend" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); invalidateVendors(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Failed to suspend vendor"); },
  });

  const restoreMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id }: { id: string }) => adminControllerRestoreVendor(id) as any,
    onMutate: ({ id }) => { setPendingAction({ id, action: "restore" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); invalidateVendors(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Failed to restore vendor"); },
  });

  // ── Column definitions ─────────────────────────────────────────────────────
  const perPage = meta?.perPage ?? 10;

  const columns: Column<Vendor>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${(page - 1) * perPage + i + 1}.`,
    },
    {
      key: "storeName",
      header: "Store Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* vendorImageUrl prefers the vendor's own logoKey and only falls
              back to a gallery photo when no logo has been set. */}
          <Avatar
            url={vendorImageUrl(row)}
            name={row.storeName}
            size={28}
            rounded="md"
          />
          <span>{row.storeName}</span>
        </div>
      ),
    },
    { key: "ownerName", header: "Owner Name" },
    { key: "email", header: "Email" },
    {
      key: "phoneNumber",
      header: "Phone",
      render: (row) => row.phoneNumber ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Date Joined",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  // ── Row actions ──────────────────────────────────────────────────────────────
  const rowActions = (vendor: Vendor) => {
    const isActing = pendingAction?.id === vendor.id;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {vendor.status === "ACTIVE" ? (
          <button
            disabled={isActing}
            onClick={() => suspendMut.mutate({ id: vendor.id })}
            className="px-2 py-0.5 rounded text-xs font-medium text-white bg-gada-accent disabled:opacity-50"
          >
            {isActing && pendingAction?.action === "suspend" ? "…" : "Suspend"}
          </button>
        ) : (
          <button
            disabled={isActing}
            onClick={() => restoreMut.mutate({ id: vendor.id })}
            className="px-2 py-0.5 rounded text-xs font-medium text-white bg-gada-success disabled:opacity-50"
          >
            {isActing && pendingAction?.action === "restore" ? "…" : "Restore"}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
          <div>
            <h2 className="text-base font-bold text-gada-dark">Vendors</h2>
            <p className="text-xs text-gada-text-muted mt-0.5">
              Table showing the list of all registered vendors
            </p>
          </div>

          {actionError && (
            <div className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
              {actionError}
            </div>
          )}

          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            emptyLabel="No vendors found"
            emptyNote="No vendors have registered yet."
            rowActions={rowActions}
            meta={meta}
            page={page}
            onPageChange={setPage}
          />
        </div>

        <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
          <span>2025 © GADA EVENT</span>
          <span>Designed by Gadarings Technology</span>
        </footer>
      </div>
    </>
  );
}
