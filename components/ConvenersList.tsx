"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminControllerListConveners,
  getAdminControllerListConvenersQueryKey,
  adminControllerSuspendUser,
  adminControllerRestoreUser,
  adminControllerDeleteUser,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListConvenersParams } from "@/lib/api/generated/model/adminControllerListConvenersParams";
import type { Convener, ConvenerListResponse } from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Avatar from "@/components/ui/Avatar";
import { keyToUrl } from "@/lib/utils/media";

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
          Remove <strong>{convener.displayName}</strong> from the platform? Their account will be
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
  // GET /v1/admin/users/conveners takes page + perPage ONLY — it has no search
  // parameter, so there is no search box on this screen.
  const { rows, meta, isLoading, isError, refetch, page, setPage } =
    useTableQuery<Convener, AdminControllerListConvenersParams>({
      fetchFn: adminControllerListConveners,
      queryKey: getAdminControllerListConvenersQueryKey,
      mapParams: ({ page, perPage }) => ({
        page: String(page),
        perPage: String(perPage),
      }),
      extractRows: (data) => (data as ConvenerListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as ConvenerListResponse | undefined)?.meta,
      perPage: 10,
    });

  // ── Mutations (raw useMutation — generated hooks collapse to `never` for void responses) ──
  // TODO: revert to generated hooks once convener/user mutation response schema lands

  const invalidateConveners = () =>
    queryClient.invalidateQueries({ queryKey: getAdminControllerListConvenersQueryKey() });

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
    mutationFn: ({ id }: { id: string }) => adminControllerDeleteUser(id) as any,
    onMutate: ({ id }) => { setPendingAction({ id, action: "remove" }); setActionError(null); },
    onSuccess: () => { setPendingAction(null); setConfirmRemove(null); invalidateConveners(); },
    onError: (err) => { setPendingAction(null); setActionError((err as Error).message ?? "Failed to remove convener"); },
  });

  // ── Column definitions ─────────────────────────────────────────────────────
  const perPage = meta?.perPage ?? 10;

  // This endpoint returns aggregate rows only — {id, email, displayName,
  // eventCount, totalRevenue}. There is no phone, GADA ID, status or join date
  // in the payload, so those columns were removed rather than rendered as "—".
  const columns: Column<Convener>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${(page - 1) * perPage + i + 1}.`,
    },
    {
      key: "displayName",
      header: "Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar url={keyToUrl(row.photoKey)} name={row.displayName} size={28} />
          <span>{row.displayName}</span>
        </div>
      ),
    },
    { key: "email", header: "Email" },
    {
      key: "eventCount",
      header: "Events",
      render: (row) => row.eventCount.toLocaleString(),
    },
    {
      key: "totalRevenue",
      header: "Revenue",
      render: (row) => formatNaira(row.totalRevenue),
    },
  ];

  // ── Row actions ──────────────────────────────────────────────────────────────
  const rowActions = (convener: Convener) => {
    const isActing = pendingAction?.id === convener.id;

    // The conveners payload carries no status field, so we cannot tell whether a
    // given convener is currently suspended. Both actions are therefore always
    // offered rather than toggled on a status we don't have.
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          disabled={isActing}
          onClick={() => suspendMut.mutate({ id: convener.id })}
          className="px-2 py-0.5 rounded text-xs font-medium text-white bg-gada-accent disabled:opacity-50"
        >
          {isActing && pendingAction?.action === "suspend" ? "…" : "Suspend"}
        </button>
        <button
          disabled={isActing}
          onClick={() => restoreMut.mutate({ id: convener.id })}
          className="px-2 py-0.5 rounded text-xs font-medium text-white bg-gada-success disabled:opacity-50"
        >
          {isActing && pendingAction?.action === "restore" ? "…" : "Restore"}
        </button>
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
            emptyNote="No users have created events yet."
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
