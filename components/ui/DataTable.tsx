"use client";

import type { ReactNode } from "react";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import type { PaginationMeta } from "@/lib/api/types/admin";

export interface Column<TRow> {
  key: string;
  header: string;
  // rowIndex is 0-based within the current page
  render?: (row: TRow, rowIndex: number) => ReactNode;
  className?: string;
}

interface DataTableProps<TRow> {
  columns: Column<TRow>[];
  rows: TRow[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyLabel?: string;
  emptyNote?: string;
  // Renders above the table — search boxes, selects, date pickers, etc.
  filters?: ReactNode;
  // Per-row action slot rendered in a trailing "Action" column
  rowActions?: (row: TRow) => ReactNode;
  meta: PaginationMeta | undefined;
  page: number;
  onPageChange: (p: number) => void;
}

export default function DataTable<TRow extends { id?: unknown }>({
  columns,
  rows,
  isLoading,
  isError,
  onRetry,
  emptyLabel = "No data found",
  emptyNote,
  filters,
  rowActions,
  meta,
  page,
  onPageChange,
}: DataTableProps<TRow>) {
  const totalPages = meta?.totalPages ?? 1;
  const totalCount = meta !== undefined ? meta.total : rows.length;
  const perPage = meta?.perPage ?? 10;

  return (
    <div className="flex flex-col gap-4">
      {filters && (
        <div className="flex flex-wrap items-end gap-3">{filters}</div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Spinner size={28} />
        </div>
      )}

      {isError && (
        <ErrorState message="Failed to load data." onRetry={onRetry} />
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState label={emptyLabel} note={emptyNote} />
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left py-3 px-3 text-xs font-semibold text-gada-text-muted whitespace-nowrap ${col.className ?? ""}`}
                  >
                    {col.header}
                  </th>
                ))}
                {rowActions && (
                  <th className="text-left py-3 px-3 text-xs font-semibold text-gada-text-muted whitespace-nowrap">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={String(row.id ?? i)}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-3 text-xs text-gada-text-secondary whitespace-nowrap ${col.className ?? ""}`}
                    >
                      {col.render
                        ? col.render(row, i)
                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="py-3 px-3">{rowActions(row)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer: entry count + pagination */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gada-text-muted">
            {meta !== undefined
              ? totalCount > 0
                ? `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalCount)} of ${totalCount} entries`
                : "No entries"
              : totalCount > 0
                ? `${totalCount} ${totalCount === 1 ? "entry" : "entries"}`
                : "No entries"}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded text-xs font-medium border border-gada-border-light text-gada-text-primary disabled:opacity-40"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`w-7 h-7 rounded text-xs font-medium ${
                    page === p
                      ? "bg-gada-dark text-white border-0"
                      : "border border-gada-border-light text-gada-text-primary"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 rounded text-xs font-medium border border-gada-border-light text-gada-text-primary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
