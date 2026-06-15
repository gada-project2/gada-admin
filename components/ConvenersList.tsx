"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminControllerGetConveners,
  getAdminControllerGetConvenersQueryKey,
  adminControllerSuspendUser,
  adminControllerRestoreUser,
  adminControllerRemoveUser,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerGetConvenersParams } from "@/lib/api/generated/model/adminControllerGetConvenersParams";
import type { Convener, ConvenerListResponse } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

function StatusBadge({ status }: { status: Convener["status"] }) {
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

// ─── Remove confirmation dialog ───────────────────────────────────────────────

function RemoveDialog({
  convener,
  onConfirm,
  onCancel,
  isPending,
}: {
  convener: Convener;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-bold text-gada-dark mb-2">Remove Convener?</h3>
        <p className="text-sm text-gada-text-secondary mb-5">
          Remove <strong>{convener.name}</strong> from the platform? Their account will be
          deactivated and they will no longer be able to log in. Ticket and payment history
          is preserved. This action cannot be undone.
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
            {isPending ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConvenersList() {
  const queryClient = useQueryClient();

  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: "suspend" | "restore" | "remove";
  } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Convener | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Table query ───────────────────────────────────────────────────────────────
  // Spec: conveners endpoint always returns ACTIVE users; no status filter dropdown.
  // Known backend findMany search bug — ErrorState handles 500s gracefully.
  const { rows, meta, isLoading, isError, refetch, search, setSearch, page, setPage } =
    useTableQuery<Convener, AdminControllerGetConvenersParams>({
      fetchFn: adminControllerGetConveners,
      queryKey: getAdminControllerGetConvenersQueryKey,
      mapParams: ({ page, perPage, search }) => ({
        page,
        perPage,
        ...(search ? { search } : {}),
      }),
      extractRows: (data) => (data as ConvenerListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as ConvenerListResponse | undefined)?.meta,
      perPage: 10,
    });

  useEffect(() => {
    console.log("[conveners] rows:", rows);
    console.log("[conveners] meta:", meta);
  }, [rows, meta]);

  // ── Mutations (raw useMutation — generated hooks collapse to `never` for void responses) ──
  // TODO: revert to generated hooks once convener/user mutation response schema lands

  const invalidateConveners = () =>
    queryClient.invalidateQueries({ queryKey: ["/v1/admin/users/conveners"] });

  const suspendMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id }: { id: string }) => adminControllerSuspendUser(id) as any,
    onMutate: ({ id }) => { setPendingAction({ id, action: "suspend" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); invalidateConveners(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Failed to suspend convener"); },
  });

  const restoreMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id }: { id: string }) => adminControllerRestoreUser(id) as any,
    onMutate: ({ id }) => { setPendingAction({ id, action: "restore" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); invalidateConveners(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Failed to restore convener"); },
  });

  const removeMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id }: { id: string }) => adminControllerRemoveUser(id) as any,
    onMutate: ({ id }) => { setPendingAction({ id, action: "remove" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); setConfirmRemove(null); invalidateConveners(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Failed to remove convener"); },
  });

  // ── Column definitions ─────────────────────────────────────────────────────
  const perPage = meta?.perPage ?? 10;

  const columns: Column<Convener>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${(page - 1) * perPage + i + 1}.`,
    },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "phone",
      header: "Phone",
      render: (row) => row.phone ?? "—",
    },
    {
      key: "gadaId",
      header: "GADA ID",
      render: (row) => row.gadaId ?? "—",
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
  const rowActions = (convener: Convener) => {
    const isActing = pendingAction?.id === convener.id;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {convener.status === "ACTIVE" ? (
          <button
            disabled={isActing}
            onClick={() => suspendMut.mutate({ id: convener.id })}
            className="px-2 py-0.5 rounded text-xs font-medium text-white bg-gada-accent disabled:opacity-50"
          >
            {isActing && pendingAction?.action === "suspend" ? "…" : "Suspend"}
          </button>
        ) : (
          <button
            disabled={isActing}
            onClick={() => restoreMut.mutate({ id: convener.id })}
            className="px-2 py-0.5 rounded text-xs font-medium text-white bg-gada-success disabled:opacity-50"
          >
            {isActing && pendingAction?.action === "restore" ? "…" : "Restore"}
          </button>
        )}
        <button
          disabled={isActing}
          onClick={() => setConfirmRemove(convener)}
          className="px-2 py-0.5 rounded text-xs font-medium text-white bg-gada-danger disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    );
  };

  // ── Filter controls (search only — endpoint always returns ACTIVE) ────────────
  const filters = (
    <div className="flex flex-col gap-1 flex-1">
      <label className="text-xs text-gada-text-muted font-medium">Search:</label>
      <div className="flex items-center border border-gada-border-light rounded-lg px-3 py-2 gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, email or GADA ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-xs text-gada-text-secondary outline-none bg-transparent"
        />
      </div>
    </div>
  );

  return (
    <>
      {confirmRemove && (
        <RemoveDialog
          convener={confirmRemove}
          onConfirm={() => removeMut.mutate({ id: confirmRemove.id })}
          onCancel={() => setConfirmRemove(null)}
          isPending={pendingAction?.action === "remove"}
        />
      )}

      <div className="flex flex-col gap-5">
        <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
          <div>
            <h2 className="text-base font-bold text-gada-dark">Conveners</h2>
            <p className="text-xs text-gada-text-muted mt-0.5">
              Table showing the list of all registered conveners
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
            emptyLabel="No conveners found"
            emptyNote="Try adjusting your search term."
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
