"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAdminControllerGetGroup,
  adminControllerSuspendGroup,
  adminControllerRestoreGroup,
  adminControllerDeleteGroup,
  getAdminControllerGetGroupQueryKey,
  getAdminControllerListGroupsQueryKey,
} from "@/lib/api/generated/admin/admin";
import type {
  GroupDetail,
  GroupStatus,
  GroupMemberRow,
  GroupEventSummary,
  AdminEventStatus,
} from "@/lib/api/types/admin";
import { keyToUrl } from "@/lib/utils/media";
import Avatar from "@/components/ui/Avatar";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import DataTable, { type Column } from "@/components/ui/DataTable";

interface Props {
  id: string;
}

const MIN_REASON_LENGTH = 3;

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

const STATUS_STYLE: Record<GroupStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
};

function StatusBadge({ status }: { status: GroupStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{titleCase(status)}</span>;
}

const ROLE_STYLE: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MEMBER: "bg-gray-100 text-gray-600",
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_STYLE[role] ?? "bg-gada-surface-card text-gada-text-secondary";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{titleCase(role)}</span>;
}

// Same status→color mapping as EventModerationList/ConvenerDetailView, so an
// event badge looks identical everywhere it's shown.
const EVENT_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PUBLISHED: { bg: "#dcfce7", color: "#16a34a", label: "Published" },
  DRAFT: { bg: "#f3f4f6", color: "#4b5563", label: "Draft" },
  CANCELLED: { bg: "#fee2e2", color: "#dc2626", label: "Cancelled" },
  SUSPENDED: { bg: "#ffedd5", color: "#c2410c", label: "Suspended" },
  COMPLETED: { bg: "#e0e7ff", color: "#4338ca", label: "Completed" },
};

function EventStatusBadge({ status }: { status: AdminEventStatus }) {
  const s = EVENT_STATUS_STYLE[status] ?? { bg: "#f3f4f6", color: "#4b5563", label: status };
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function GroupDetailView({ id }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [suspendReason, setSuspendReason] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: raw, isLoading, isError, refetch } = useAdminControllerGetGroup(id);
  const group = raw as unknown as GroupDetail | undefined;

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: getAdminControllerGetGroupQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getAdminControllerListGroupsQueryKey() });
  };

  // Raw useMutation — generated hooks collapse to never for void responses,
  // same discipline as every other suspend/restore/delete in this app.
  const suspendMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (): Promise<any> => adminControllerSuspendGroup(id, { reason: suspendReason.trim() }),
    onSuccess: () => {
      setSuspendReason("");
      invalidateBoth();
    },
  });

  const restoreMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (): Promise<any> => adminControllerRestoreGroup(id),
    onSuccess: invalidateBoth,
  });

  const deleteMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (): Promise<any> => adminControllerDeleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getAdminControllerListGroupsQueryKey() });
      router.push("/dashboard/groups");
    },
  });

  const isMutating = suspendMut.isPending || restoreMut.isPending || deleteMut.isPending;

  const reasonTooShort = suspendReason.trim().length > 0 && suspendReason.trim().length < MIN_REASON_LENGTH;
  const canSuspend = suspendReason.trim().length >= MIN_REASON_LENGTH;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/groups"
          className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Groups
        </Link>
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load group details." onRetry={refetch} />
        </div>
      </div>
    );
  }

  const memberColumns: Column<GroupMemberRow>[] = [
    {
      key: "user",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar url={keyToUrl(row.user?.photoKey)} name={row.user?.displayName} size={26} />
          <span>{row.user?.displayName ?? "—"}</span>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (row) => <RoleBadge role={row.role} /> },
    { key: "joinedAt", header: "Joined", render: (row) => formatDate(row.joinedAt) },
  ];

  const eventColumns: Column<GroupEventSummary>[] = [
    {
      key: "name",
      header: "Event",
      render: (row) => (
        <Link
          href={`/dashboard/event-moderation/${row.id}`}
          className="text-sm font-medium hover:underline"
          style={{ color: "#f59e0b" }}
        >
          {row.name}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (row) => <EventStatusBadge status={row.status} /> },
    { key: "visibility", header: "Visibility", render: (row) => titleCase(row.visibility) },
    { key: "startDate", header: "Date", render: (row) => formatDate(row.startDate) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/groups"
        className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Back to Groups
      </Link>

      {/* Header */}
      <div className="rounded-xl p-5 bg-white flex items-center gap-4 flex-wrap">
        <Avatar url={keyToUrl(group.photoKey)} name={group.name} size={56} rounded="md" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gada-dark truncate">{group.name}</h2>
          <p className="text-sm text-gada-text-muted">
            {titleCase(group.category)} · {group.memberCount.toLocaleString()} members ·{" "}
            {group.followerCount.toLocaleString()} followers
          </p>
        </div>
        <StatusBadge status={group.status} />
      </div>

      {/* Created by */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-1">
        <h3 className="text-sm font-bold text-gada-dark">Created By</h3>
        {group.createdBy ? (
          <Link href={`/dashboard/users/${group.createdBy.id}`} className="text-sm font-medium hover:underline w-fit" style={{ color: "#f59e0b" }}>
            {group.createdBy.displayName ?? group.createdBy.email}
          </Link>
        ) : (
          <span className="text-sm text-gada-text-muted">—</span>
        )}
        {group.description && <p className="text-sm text-gada-text-muted mt-2">{group.description}</p>}
      </div>

      {/* Members */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gada-dark">Members ({group.members.length})</h3>
        <DataTable
          columns={memberColumns}
          rows={group.members}
          isLoading={false}
          isError={false}
          onRetry={refetch}
          emptyLabel="No members found"
          emptyNote="This group has no members."
          meta={{ page: 1, perPage: group.members.length || 1, total: group.members.length, totalPages: 1 }}
          page={1}
          onPageChange={() => {}}
        />
      </div>

      {/* Events */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gada-dark">Events</h3>
          <p className="text-xs text-gada-text-muted mt-0.5">The 10 most recently posted events under this group.</p>
        </div>
        <DataTable
          columns={eventColumns}
          rows={group.events}
          isLoading={false}
          isError={false}
          onRetry={refetch}
          emptyLabel="No events found"
          emptyNote="No events have been posted under this group."
          meta={{ page: 1, perPage: group.events.length || 1, total: group.events.length, totalPages: 1 }}
          page={1}
          onPageChange={() => {}}
        />
      </div>

      {/* Admin actions */}
      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h3 className="text-sm font-bold text-gada-dark">Admin Actions</h3>
          <p className="text-xs text-gada-text-muted mt-0.5">
            Suspending a group requires a reason — it is audited and shown in the admin action log.
          </p>
        </div>

        {(suspendMut.isError || restoreMut.isError || deleteMut.isError) && (
          <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
            {suspendMut.isError
              ? (suspendMut.error as Error).message ?? "Could not suspend group. Please try again."
              : restoreMut.isError
                ? "Could not restore group. Please try again."
                : "Could not delete group. Please try again."}
          </div>
        )}

        {/* Suspend — required reason, min 3 chars per SuspendGroupDto. Submit
            stays disabled until that's met, so an empty/too-short reason can
            never even reach the network. */}
        {group.status === "ACTIVE" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="suspend-reason" className="text-xs font-medium text-gada-text-secondary">
              Reason (required, shown in the audit log)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="suspend-reason"
                type="text"
                maxLength={500}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Repeated spam events violating community guidelines"
                className="flex-1 border rounded-lg px-3 py-2.5 text-sm border-gada-border-light outline-none"
              />
              <button
                disabled={isMutating || !canSuspend}
                onClick={() => suspendMut.mutate()}
                className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white bg-gada-accent transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                {suspendMut.isPending ? "Suspending…" : "Suspend Group"}
              </button>
            </div>
            {reasonTooShort && (
              <p className="text-xs font-medium text-red-600">
                Reason must be at least {MIN_REASON_LENGTH} characters.
              </p>
            )}
          </div>
        )}

        {group.status === "SUSPENDED" && (
          <div>
            <button
              disabled={isMutating}
              onClick={() => restoreMut.mutate()}
              className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white bg-gada-success transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {restoreMut.isPending ? "Restoring…" : "Restore Group"}
            </button>
          </div>
        )}

        <div style={{ borderTop: "1px solid #f3f4f6" }} className="pt-4">
          {confirmingDelete ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 text-sm font-medium" style={{ color: "#b91c1c" }}>
                Permanently delete “{group.name}”? Its events will be detached (not deleted). This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={isMutating}
                  onClick={() => setConfirmingDelete(false)}
                  className="py-2.5 px-4 rounded-lg font-semibold text-sm border border-gada-border-light text-gada-text-primary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isMutating}
                  onClick={() => deleteMut.mutate()}
                  className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white bg-gada-danger disabled:opacity-50"
                >
                  {deleteMut.isPending ? "Deleting…" : "Yes, delete permanently"}
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={isMutating}
              onClick={() => setConfirmingDelete(true)}
              className="py-2.5 px-5 rounded-lg font-semibold text-sm bg-white text-gada-danger border-2 border-gada-danger disabled:opacity-50"
            >
              Delete Group
            </button>
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
