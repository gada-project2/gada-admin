"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminControllerGetVendors,
  getAdminControllerGetVendorsQueryKey,
  adminControllerSuspendVendor,
  adminControllerRestoreVendor,
  adminControllerRemoveVendor,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerGetVendorsParams } from "@/lib/api/generated/model/adminControllerGetVendorsParams";
import type { Vendor, VendorListResponse, VendorStatus } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";

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

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteDialog({
  vendor,
  onConfirm,
  onCancel,
  isPending,
}: {
  vendor: Vendor;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-bold text-gada-dark mb-2">Delete Vendor?</h3>
        <p className="text-sm text-gada-text-secondary mb-5">
          Remove <strong>{vendor.storeName}</strong> from the platform? Historical booking
          and payment data is preserved, but the vendor will no longer appear in any listings.
          This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gada-border-light text-gada-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-danger disabled:opacity-50"
          >
            {isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VendorsList() {
  const queryClient = useQueryClient();

  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: "suspend" | "restore" | "delete";
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Vendor | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Table query (URL state + debounce + data fetching) ────────────────────────
  const { rows, meta, isLoading, isError, refetch, search, setSearch, page, setPage, params, setParam } =
    useTableQuery<Vendor, AdminControllerGetVendorsParams>({
      fetchFn: adminControllerGetVendors,
      queryKey: getAdminControllerGetVendorsQueryKey,
      mapParams: ({ page, perPage, search, extras }) => ({
        page,
        perPage,
        ...(search ? { search } : {}),
        ...(extras.status ? { status: extras.status } : {}),
      }),
      extractRows: (data) => (data as VendorListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as VendorListResponse | undefined)?.meta,
      perPage: 10,
      extraParamKeys: ["status"],
    });

  // ── Mutations (raw useMutation — generated hooks collapse to never for void responses) ──
  // TODO: revert to generated hooks once vendor mutation response schema lands in the OpenAPI spec

  const invalidateVendors = () =>
    queryClient.invalidateQueries({ queryKey: ["/v1/admin/vendors"] });

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

  const deleteMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id }: { id: string }) => adminControllerRemoveVendor(id) as any,
    onMutate: ({ id }) => { setPendingAction({ id, action: "delete" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); setConfirmDelete(null); invalidateVendors(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Failed to delete vendor"); },
  });

  // ── Column definitions ─────────────────────────────────────────────────────
  const perPage = meta?.perPage ?? 10;

  const columns: Column<Vendor>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${(page - 1) * perPage + i + 1}.`,
    },
    { key: "storeName", header: "Store Name" },
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
        <button
          disabled={isActing}
          onClick={() => setConfirmDelete(vendor)}
          className="px-2 py-0.5 rounded text-xs font-medium text-white bg-gada-danger disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    );
  };

  // ── Filter controls (status + search) ────────────────────────────────────────
  const filters = (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gada-text-muted font-medium">Status:</label>
        <select
          value={params.status ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
          className="border border-gada-border-light rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none min-w-20"
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <label className="text-xs text-gada-text-muted font-medium">Search:</label>
        <div className="flex items-center border border-gada-border-light rounded-lg px-3 py-2 gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by store name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-xs text-gada-text-secondary outline-none bg-transparent"
          />
        </div>
      </div>
    </>
  );

  return (
    <>
      {confirmDelete && (
        <DeleteDialog
          vendor={confirmDelete}
          onConfirm={() => deleteMut.mutate({ id: confirmDelete.id })}
          onCancel={() => setConfirmDelete(null)}
          isPending={pendingAction?.action === "delete"}
        />
      )}

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
            emptyNote="Try adjusting your filters or search term."
            filters={filters}
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
