"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAdminControllerGetUser,
  useAdminControllerListTickets,
  useAdminControllerListVolunteers,
  adminControllerSuspendUser,
  adminControllerRestoreUser,
  adminControllerDeleteUser,
  getAdminControllerGetUserQueryKey,
  getAdminControllerListUsersQueryKey,
} from "@/lib/api/generated/admin/admin";
import type {
  UserDetail,
  UserStatus,
  TicketListResponse,
  TicketPurchase,
  VolunteerListResponse,
  VolunteerApplication,
} from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
import { keyToUrl } from "@/lib/utils/media";
import Avatar from "@/components/ui/Avatar";
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

const STATUS_STYLE: Record<UserStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
  DELETED: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: UserStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
}

function VerifiedPill({ verified, label }: { verified: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {label}: {verified ? "Verified" : "Not verified"}
    </span>
  );
}

function CapabilityBadge({ on, label, href }: { on: boolean; label: string; href?: string | null }) {
  const cls = on
    ? "bg-blue-50 text-blue-700 border border-blue-200"
    : "bg-gray-50 text-gray-400 border border-gray-100";

  // Only a real, existing detail route gets a link — same discipline as
  // AdminLogsList's TargetCell (only Event links there, because only Event
  // has a real detail page). Convener has no [id] route in this app yet.
  if (on && href) {
    return (
      <Link href={href} className={`px-3 py-1.5 rounded-lg text-sm font-medium hover:underline ${cls}`}>
        {label} →
      </Link>
    );
  }

  return <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${cls}`}>{label}</span>;
}

export default function UserDetailView({ id }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [purchasePage, setPurchasePage] = useState(1);
  const [volunteerPage, setVolunteerPage] = useState(1);

  const { data: raw, isLoading, isError, refetch } = useAdminControllerGetUser(id);
  const user = raw as unknown as UserDetail | undefined;

  // Scoped by userId — NOT the full unfiltered list. GET /v1/admin/tickets and
  // GET /v1/admin/volunteers both accept a userId filter (verified against
  // source, AdminService.listTickets / listVolunteers).
  const { data: purchasesRaw, isLoading: purchasesLoading, isError: purchasesError, refetch: refetchPurchases } =
    useAdminControllerListTickets({ page: String(purchasePage), perPage: "10", userId: id });
  const purchasesResp = purchasesRaw as unknown as TicketListResponse | undefined;

  const { data: volunteerRaw, isLoading: volunteerLoading, isError: volunteerError, refetch: refetchVolunteer } =
    useAdminControllerListVolunteers({ page: String(volunteerPage), perPage: "10", userId: id, status: "", eventId: "" });
  const volunteerResp = volunteerRaw as unknown as VolunteerListResponse | undefined;

  // ── Mutations (raw useMutation — generated hooks collapse to never for void
  // responses, same discipline as ConvenersList/VendorsList/EventDetailView) ──
  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: getAdminControllerGetUserQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getAdminControllerListUsersQueryKey() });
  };

  const suspendMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: () => adminControllerSuspendUser(id) as any,
    onSuccess: invalidateBoth,
  });

  const restoreMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: () => adminControllerRestoreUser(id) as any,
    onSuccess: invalidateBoth,
  });

  const deleteMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: () => adminControllerDeleteUser(id) as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getAdminControllerListUsersQueryKey() });
      router.push("/dashboard/users");
    },
  });

  const isMutating = suspendMut.isPending || restoreMut.isPending || deleteMut.isPending;
  const mutationErrorMsg: string | null =
    suspendMut.isError ? "Could not suspend user. Please try again." :
    restoreMut.isError ? "Could not restore user. Please try again." :
    deleteMut.isError ? "Could not delete user. Please try again." : null;

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/users"
          className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Users
        </Link>
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load user details." onRetry={refetch} />
        </div>
      </div>
    );
  }

  const infoRows = [
    { label: "Phone", value: user.phoneNumber ?? "—" },
    { label: "Bio", value: user.bio ?? "—" },
    { label: "Date of Birth", value: formatDate(user.dateOfBirth) },
    { label: "Joined", value: formatDate(user.createdAt) },
    { label: "Last Updated", value: formatDate(user.updatedAt) },
  ];

  const purchaseColumns: Column<TicketPurchase>[] = [
    { key: "eventName", header: "Event" },
    { key: "amountKobo", header: "Amount", render: (row) => formatNaira(row.amountKobo) },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Date", render: (row) => formatDate(row.createdAt) },
  ];

  const volunteerColumns: Column<VolunteerApplication>[] = [
    { key: "event", header: "Event", render: (row) => row.event?.name ?? "—" },
    { key: "role", header: "Role", render: (row) => row.role?.name ?? "—" },
    { key: "status", header: "Status" },
    { key: "createdAt", header: "Date", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/users"
        className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Back to Users
      </Link>

      {mutationErrorMsg && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {mutationErrorMsg}
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl p-5 bg-white flex items-center gap-4 flex-wrap">
        <Avatar url={keyToUrl(user.photoKey)} name={user.displayName} size={56} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gada-dark truncate">{user.displayName ?? "—"}</h2>
          <p className="text-sm text-gada-text-muted truncate">{user.email}</p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      {/* Info card */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gada-dark">Profile Info</h3>

        {/* KYC shown prominently, above the rest of the info table. */}
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
            user.ninVerified ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
          }`}
        >
          {user.ninVerified ? (
            <ShieldCheck size={20} className="text-green-600 shrink-0" />
          ) : (
            <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          )}
          <div>
            <p className={`text-sm font-semibold ${user.ninVerified ? "text-green-800" : "text-amber-800"}`}>
              KYC (NIN): {user.ninVerified ? "Verified" : "Not verified"}
            </p>
            <p className="text-xs text-gada-text-muted">
              The NIN itself is one-way hashed and never stored in reversible form — this is the only
              signal admin can see.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <VerifiedPill verified={user.isEmailVerified} label="Email" />
          <VerifiedPill verified={user.isPhoneVerified} label="Phone" />
        </div>

        <div className="border rounded-xl overflow-hidden border-gada-border-light">
          {infoRows.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-2"
              style={{ borderBottom: i < infoRows.length - 1 ? "1px solid #f3f4f6" : "none" }}
            >
              <div className="px-4 py-3 text-sm text-gada-text-muted font-medium border-r border-gada-border-light">
                {row.label}
              </div>
              <div className="px-4 py-3 text-sm font-semibold text-gada-dark">{row.value}</div>
            </div>
          ))}
        </div>

        {/* Capability badges. Vendor now links to the real Vendor Detail page
            using vendorProfileId (VendorProfile.id — NOT this user's own id;
            getUser joins it in specifically for this link). Convener stays a
            static badge: app/dashboard/conveners/[id] doesn't exist in this
            app yet, so linking there would 404 — same discipline as
            AdminLogsList's TargetCell, which only links Event because that's
            the only detail route that's real. */}
        <div className="flex gap-2 flex-wrap pt-1">
          <CapabilityBadge on={user.canConvene} label="Convener" />
          <CapabilityBadge
            on={user.isVendor}
            label="Vendor"
            href={user.vendorProfileId ? `/dashboard/vendors/${user.vendorProfileId}` : null}
          />
          <CapabilityBadge on={user.isVolunteer} label="Volunteer" />
        </div>
      </div>

      {/* Purchase history — scoped to this user via ?userId=, same DataTable
          pattern as the Ticketing screen (components/TicketsList.tsx). */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gada-dark">Purchase History</h3>
          <p className="text-xs text-gada-text-muted mt-0.5">Ticket purchases made by this user.</p>
        </div>
        <DataTable
          columns={purchaseColumns}
          rows={purchasesResp?.data ?? []}
          isLoading={purchasesLoading}
          isError={purchasesError}
          onRetry={refetchPurchases}
          emptyLabel="No purchases found"
          emptyNote="This user has not purchased any tickets."
          meta={purchasesResp?.meta}
          page={purchasePage}
          onPageChange={setPurchasePage}
        />
      </div>

      {/* Volunteer applications — scoped to this user via ?userId=. */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gada-dark">Volunteer Applications</h3>
          <p className="text-xs text-gada-text-muted mt-0.5">Volunteer applications submitted by this user.</p>
        </div>
        <DataTable
          columns={volunteerColumns}
          rows={volunteerResp?.data ?? []}
          isLoading={volunteerLoading}
          isError={volunteerError}
          onRetry={refetchVolunteer}
          emptyLabel="No volunteer applications found"
          emptyNote="This user has not applied to volunteer for any event."
          meta={volunteerResp?.meta}
          page={volunteerPage}
          onPageChange={setVolunteerPage}
        />
      </div>

      {/* Admin actions — same underlying mutations ConvenersList/VendorsList
          use from their row-action menus, also reachable here on detail. */}
      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h3 className="text-sm font-bold text-gada-dark">Admin Actions</h3>
          <p className="text-xs text-gada-text-muted mt-0.5">Suspend, restore, or permanently delete this account.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={isMutating || user.status === "SUSPENDED"}
            onClick={() => suspendMut.mutate()}
            className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white bg-gada-accent transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {suspendMut.isPending ? "Suspending…" : user.status === "SUSPENDED" ? "Already suspended" : "Suspend User"}
          </button>
          <button
            disabled={isMutating || user.status === "ACTIVE"}
            onClick={() => restoreMut.mutate()}
            className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white bg-gada-success transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {restoreMut.isPending ? "Restoring…" : user.status === "ACTIVE" ? "Already active" : "Restore User"}
          </button>
        </div>

        <div style={{ borderTop: "1px solid #f3f4f6" }} className="pt-4">
          {confirmingDelete ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 text-sm font-medium text-red-700">
                Permanently delete “{user.displayName ?? user.email}”? This cannot be undone.
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
              disabled={isMutating || user.status === "DELETED"}
              onClick={() => setConfirmingDelete(true)}
              className="py-2.5 px-5 rounded-lg font-semibold text-sm bg-white text-gada-danger border-2 border-gada-danger disabled:opacity-50"
            >
              {user.status === "DELETED" ? "Already deleted" : "Delete User"}
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
