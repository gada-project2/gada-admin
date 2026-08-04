"use client";

import { useRouter } from "next/navigation";
import {
  adminControllerListUsers,
  getAdminControllerListUsersQueryKey,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListUsersParams } from "@/lib/api/generated/model/adminControllerListUsersParams";
import type { PlatformUser, UserListResponse, UserStatus } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Avatar from "@/components/ui/Avatar";
import { keyToUrl } from "@/lib/utils/media";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

const STATUS_OPTIONS = ["All", "ACTIVE", "SUSPENDED", "DELETED"];
const ROLE_OPTIONS = ["All", "USER", "ADMIN"];

const STATUS_STYLE: Record<UserStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
  DELETED: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: UserStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

function KycBadge({ verified }: { verified: boolean }) {
  const cls = verified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{verified ? "Verified" : "Unverified"}</span>;
}

function FlagBadge({ on }: { on: boolean }) {
  if (!on) return <span className="text-gray-300">—</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Yes</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
// GET /v1/admin/users — filters: status, role, search (email/displayName).
// Verified against source (AdminService.listUsers) 2026-08-04.

export default function UsersList() {
  const router = useRouter();

  const { rows, meta, isLoading, isError, refetch, page, setPage, search, setSearch, params, setParam } =
    useTableQuery<PlatformUser, AdminControllerListUsersParams>({
      fetchFn: adminControllerListUsers,
      queryKey: getAdminControllerListUsersQueryKey,
      mapParams: ({ page, perPage, search, extras }) => ({
        page: String(page),
        perPage: String(perPage),
        status: extras.status ?? "",
        role: extras.role ?? "",
        search,
      }),
      extractRows: (data) => (data as UserListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as UserListResponse | undefined)?.meta,
      perPage: 10,
      extraParamKeys: ["status", "role"],
    });

  const perPage = meta?.perPage ?? 10;

  const columns: Column<PlatformUser>[] = [
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
          <span>{row.displayName ?? "—"}</span>
        </div>
      ),
    },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "ninVerified", header: "KYC", render: (row) => <KycBadge verified={row.ninVerified} /> },
    { key: "isVendor", header: "Vendor", render: (row) => <FlagBadge on={row.isVendor} /> },
    { key: "isVolunteer", header: "Volunteer", render: (row) => <FlagBadge on={row.isVolunteer} /> },
    { key: "canConvene", header: "Convener", render: (row) => <FlagBadge on={row.canConvene} /> },
    { key: "createdAt", header: "Joined", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h2 className="text-base font-bold text-gada-dark">Users</h2>
          <p className="text-xs text-gada-text-muted mt-0.5">
            All platform users — click a row to see full profile detail.
          </p>
        </div>

        {/* Filters — same URL-driven pattern as the other admin list screens. */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="user-status" className="text-xs text-gada-text-muted font-medium">
              Status:
            </label>
            <select
              id="user-status"
              value={params.status ?? ""}
              onChange={(e) => setParam("status", e.target.value === "All" ? "" : e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
              style={{ minWidth: 130 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s === "All" ? "" : s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="user-role" className="text-xs text-gada-text-muted font-medium">
              Role:
            </label>
            <select
              id="user-role"
              value={params.role ?? ""}
              onChange={(e) => setParam("role", e.target.value === "All" ? "" : e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
              style={{ minWidth: 110 }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r === "All" ? "" : r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="user-search" className="text-xs text-gada-text-muted font-medium">
              Search:
            </label>
            <input
              id="user-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name…"
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyLabel="No users found"
          emptyNote="Try adjusting the filters."
          onRowClick={(row) => router.push(`/dashboard/users/${row.id}`)}
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
  );
}
