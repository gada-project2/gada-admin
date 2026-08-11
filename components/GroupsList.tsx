"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminControllerListGroups,
  getAdminControllerListGroupsQueryKey,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerListGroupsParams } from "@/lib/api/generated/model/adminControllerListGroupsParams";
import type { GroupListRow, GroupListResponse, GroupStatus } from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Avatar from "@/components/ui/Avatar";
import { keyToUrl } from "@/lib/utils/media";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

const STATUS_OPTIONS = ["All", "ACTIVE", "SUSPENDED"];
const CATEGORY_OPTIONS = [
  "All", "OUTDOORS", "FITNESS", "GAMES", "BOOKS", "SPORTS", "ARTS", "FOOD", "FAITH", "BUSINESS", "OTHER",
];

const STATUS_STYLE: Record<GroupStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-amber-100 text-amber-700",
};

function StatusBadge({ status }: { status: GroupStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{titleCase(status)}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
// GET /v1/admin/groups — filters: category, status, search (by name).
// Verified against source (AdminService.listGroups) 2026-08-11.

export default function GroupsList() {
  const router = useRouter();

  const { rows, meta, isLoading, isError, refetch, page, setPage, search, setSearch, params, setParam } =
    useTableQuery<GroupListRow, AdminControllerListGroupsParams>({
      fetchFn: adminControllerListGroups,
      queryKey: getAdminControllerListGroupsQueryKey,
      mapParams: ({ page, perPage, search, extras }) => ({
        page: String(page),
        perPage: String(perPage),
        category: extras.category ?? "",
        status: extras.status ?? "",
        search,
      }),
      extractRows: (data) => (data as GroupListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as GroupListResponse | undefined)?.meta,
      perPage: 10,
      extraParamKeys: ["category", "status"],
    });

  const columns: Column<GroupListRow>[] = [
    {
      key: "name",
      header: "Group",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar url={keyToUrl(row.photoKey)} name={row.name} size={28} rounded="md" />
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (row) => titleCase(row.category) },
    { key: "memberCount", header: "Members", render: (row) => row.memberCount.toLocaleString() },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "createdBy",
      header: "Created By",
      render: (row) =>
        row.createdBy ? (
          <Link href={`/dashboard/users/${row.createdBy.id}`} className="hover:underline" style={{ color: "#f59e0b" }}>
            {row.createdBy.displayName ?? row.createdBy.email}
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "createdAt", header: "Created", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h2 className="text-base font-bold text-gada-dark">Groups</h2>
          <p className="text-xs text-gada-text-muted mt-0.5">
            User-created community groups — click a row to review membership and moderate.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="group-category" className="text-xs text-gada-text-muted font-medium">
              Category:
            </label>
            <select
              id="group-category"
              value={params.category ?? ""}
              onChange={(e) => setParam("category", e.target.value === "All" ? "" : e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
              style={{ minWidth: 140 }}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c === "All" ? "" : c}>
                  {c === "All" ? "All" : titleCase(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="group-status" className="text-xs text-gada-text-muted font-medium">
              Status:
            </label>
            <select
              id="group-status"
              value={params.status ?? ""}
              onChange={(e) => setParam("status", e.target.value === "All" ? "" : e.target.value)}
              className="border rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none border-gada-border-light"
              style={{ minWidth: 130 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s === "All" ? "" : s}>
                  {s === "All" ? "All" : titleCase(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="group-search" className="text-xs text-gada-text-muted font-medium">
              Search:
            </label>
            <input
              id="group-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by group name…"
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
          emptyLabel="No groups found"
          emptyNote="Try adjusting the filters."
          onRowClick={(row) => router.push(`/dashboard/groups/${row.id}`)}
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
