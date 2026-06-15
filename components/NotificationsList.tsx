"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminControllerGetAdminNotifications,
  getAdminControllerGetAdminNotificationsQueryKey,
  adminControllerCreateAdminNotification,
  adminControllerUpdateAdminNotification,
} from "@/lib/api/generated/admin/admin";
import type { AdminControllerGetAdminNotificationsParams } from "@/lib/api/generated/model/adminControllerGetAdminNotificationsParams";
import type {
  AdminNotification,
  NotificationListResponse,
  NotificationStatus,
} from "@/lib/api/types/admin";
import { useTableQuery } from "@/lib/hooks/useTableQuery";
import DataTable, { type Column } from "@/components/ui/DataTable";

// ─── Zod schema ──────────────────────────────────────────────────────────────

const notificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  audienceType: z.enum(["ALL", "SPECIFIC"]),
  specificUserIds: z.string().optional(),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
}).superRefine((val, ctx) => {
  if (val.audienceType === "SPECIFIC" && !val.specificUserIds?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["specificUserIds"],
      message: "Enter at least one user ID",
    });
  }
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISOLocal(datetimeLocal: string): string {
  return new Date(datetimeLocal).toISOString();
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowPlusFiveMin(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function AudienceLabel({ endUsers }: { endUsers: string[] }) {
  if (endUsers.includes("ALL")) return <span>All Users</span>;
  return <span>{endUsers.length} user{endUsers.length !== 1 ? "s" : ""}</span>;
}

function StatusBadge({ status }: { status: NotificationStatus }) {
  if (status === "SENT") {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        Sent
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
      Pending
    </span>
  );
}

// ─── Form modal ───────────────────────────────────────────────────────────────

interface NotificationFormProps {
  mode: "create" | "edit";
  initialValues?: AdminNotification;
  onClose: () => void;
  onSuccess: () => void;
}

function NotificationForm({ mode, initialValues, onClose, onSuccess }: NotificationFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultAudienceType =
    initialValues?.endUsers && !initialValues.endUsers.includes("ALL") ? "SPECIFIC" : "ALL";
  const defaultSpecificIds =
    initialValues?.endUsers && !initialValues.endUsers.includes("ALL")
      ? initialValues.endUsers.join(", ")
      : "";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      audienceType: defaultAudienceType,
      specificUserIds: defaultSpecificIds,
      scheduledDate: initialValues?.scheduledDate
        ? toDatetimeLocal(initialValues.scheduledDate)
        : nowPlusFiveMin(),
    },
  });

  const audienceType = watch("audienceType");

  const createMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (dto: Parameters<typeof adminControllerCreateAdminNotification>[0]) =>
      adminControllerCreateAdminNotification(dto) as any,
    onSuccess: () => { setServerError(null); onSuccess(); },
    onError: (err) => setServerError((err as Error).message ?? "Failed to send notification"),
  });

  const editMut = useMutation({
    // PATCH body workaround: generated fn drops body param (spec gen bug); pass via RequestInit options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminControllerUpdateAdminNotification(id, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      } as RequestInit) as any,
    onSuccess: () => { setServerError(null); onSuccess(); },
    onError: (err) => setServerError((err as Error).message ?? "Failed to update notification"),
  });

  const isPending = createMut.isPending || editMut.isPending;

  function onSubmit(values: NotificationFormValues) {
    const endUsers =
      values.audienceType === "ALL"
        ? ["ALL"]
        : values.specificUserIds!
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean);

    const scheduledDate = toISOLocal(values.scheduledDate);

    if (mode === "create") {
      createMut.mutate({
        title: values.title,
        description: values.description,
        endUsers,
        scheduledDate,
      });
    } else {
      const body: Record<string, unknown> = {};
      if (values.title !== initialValues?.title) body.title = values.title;
      if (values.description !== initialValues?.description) body.description = values.description;
      if (scheduledDate !== initialValues?.scheduledDate) body.scheduledDate = scheduledDate;
      const origEndUsers = initialValues?.endUsers ?? [];
      const endUsersChanged =
        JSON.stringify(endUsers.sort()) !== JSON.stringify([...origEndUsers].sort());
      if (endUsersChanged) body.endUsers = endUsers;
      if (Object.keys(body).length === 0) { onClose(); return; }
      editMut.mutate({ id: initialValues!.id, body });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gada-border-light">
          <h2 className="text-base font-bold text-gada-dark">
            {mode === "create" ? "New Notification" : "Edit Notification"}
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-gada-text-muted hover:text-gada-text-primary transition-colors disabled:opacity-50 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4 px-6 py-5 overflow-y-auto"
        >
          {serverError && (
            <div className="px-4 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {serverError}
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Title <span className="text-gada-danger">*</span>
            </label>
            <input
              {...register("title")}
              type="text"
              placeholder="Notification headline"
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            />
            {errors.title && (
              <p className="text-xs text-gada-danger">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Message <span className="text-gada-danger">*</span>
            </label>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Full notification body text…"
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2 resize-none"
            />
            {errors.description && (
              <p className="text-xs text-gada-danger">{errors.description.message}</p>
            )}
          </div>

          {/* Audience */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-gada-text-primary">
              Audience <span className="text-gada-danger">*</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gada-text-secondary cursor-pointer">
                <input
                  {...register("audienceType")}
                  type="radio"
                  value="ALL"
                  className="accent-gada-dark"
                />
                All users
              </label>
              <label className="flex items-center gap-2 text-sm text-gada-text-secondary cursor-pointer">
                <input
                  {...register("audienceType")}
                  type="radio"
                  value="SPECIFIC"
                  className="accent-gada-dark"
                />
                Specific users
              </label>
            </div>

            {audienceType === "SPECIFIC" && (
              <div className="flex flex-col gap-1">
                <textarea
                  {...register("specificUserIds")}
                  rows={3}
                  placeholder="Comma- or space-separated user IDs"
                  className="border border-gada-border-light rounded-lg px-3 py-2 text-xs text-gada-text-secondary outline-none focus:border-gada-dark bg-gada-input-bg-2 resize-none font-mono"
                />
                {errors.specificUserIds && (
                  <p className="text-xs text-gada-danger">{errors.specificUserIds.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Scheduled date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Scheduled date & time <span className="text-gada-danger">*</span>
            </label>
            <input
              {...register("scheduledDate")}
              type="datetime-local"
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            />
            <p className="text-xs text-gada-text-muted">
              Set to a future time to schedule. Set to now or a past time to send immediately.
            </p>
            {errors.scheduledDate && (
              <p className="text-xs text-gada-danger">{errors.scheduledDate.message}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gada-border-light text-gada-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-dark disabled:opacity-50"
            >
              {isPending
                ? mode === "create" ? "Sending…" : "Saving…"
                : mode === "create" ? "Send notification" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function NotificationsList() {
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; notification: AdminNotification }
    | null
  >(null);

  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const invalidateNotifications = () =>
    queryClient.invalidateQueries({ queryKey: ["/v1/admin/notifications"] });

  function handleSuccess(msg: string) {
    setModal(null);
    invalidateNotifications();
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  }

  // ── Table query ─────────────────────────────────────────────────────────────
  const { rows, meta, isLoading, isError, refetch, search, setSearch, page, setPage } =
    useTableQuery<AdminNotification, AdminControllerGetAdminNotificationsParams>({
      fetchFn: adminControllerGetAdminNotifications,
      queryKey: getAdminControllerGetAdminNotificationsQueryKey,
      mapParams: ({ page, perPage, search }) => ({
        page,
        perPage,
        ...(search ? { search } : {}),
      }),
      extractRows: (data) => (data as NotificationListResponse | undefined)?.data ?? [],
      extractMeta: (data) => (data as NotificationListResponse | undefined)?.meta,
      perPage: 10,
    });

  // ── Columns ─────────────────────────────────────────────────────────────────
  const perPage = meta?.perPage ?? 10;

  const columns: Column<AdminNotification>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${(page - 1) * perPage + i + 1}.`,
    },
    { key: "title", header: "Title" },
    {
      key: "description",
      header: "Message",
      render: (row) => (
        <span className="block max-w-xs truncate" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      key: "endUsers",
      header: "Audience",
      render: (row) => <AudienceLabel endUsers={row.endUsers} />,
    },
    {
      key: "scheduledDate",
      header: "Scheduled",
      render: (row) => formatDate(row.scheduledDate),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  // ── Row actions ─────────────────────────────────────────────────────────────
  const rowActions = (n: AdminNotification) => {
    if (n.status !== "PENDING") return null;
    return (
      <button
        onClick={() => setModal({ mode: "edit", notification: n })}
        className="px-2 py-0.5 rounded text-xs font-medium border border-gada-border-light text-gada-text-primary hover:bg-gada-surface-card transition-colors"
      >
        Edit
      </button>
    );
  };

  // ── Filters ─────────────────────────────────────────────────────────────────
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
          placeholder="Search by title or message"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-xs text-gada-text-secondary outline-none bg-transparent"
        />
      </div>
    </div>
  );

  return (
    <>
      {modal && (
        <NotificationForm
          mode={modal.mode}
          initialValues={modal.mode === "edit" ? modal.notification : undefined}
          onClose={() => setModal(null)}
          onSuccess={() =>
            handleSuccess(
              modal.mode === "create"
                ? "Notification created successfully."
                : "Notification updated successfully."
            )
          }
        />
      )}

      <div className="flex flex-col gap-5">
        <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gada-dark">Notifications</h2>
              <p className="text-xs text-gada-text-muted mt-0.5">
                Broadcast notifications sent to app users
              </p>
            </div>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-dark hover:opacity-90 transition-opacity"
            >
              + New notification
            </button>
          </div>

          {successBanner && (
            <div className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
              {successBanner}
            </div>
          )}

          <DataTable
            columns={columns}
            rows={rows}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            emptyLabel="No notifications yet"
            emptyNote={'Click "New notification" to send your first broadcast.'}
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
