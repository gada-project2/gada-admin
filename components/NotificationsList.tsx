"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { adminControllerBroadcast } from "@/lib/api/generated/admin/admin";

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW CHANGE
//
// This screen used to be a CRUD table over stored admin notifications:
//   GET    /v1/admin/notifications        (list, paginated)
//   POST   /v1/admin/notifications        (create, with scheduledDate)
//   PATCH  /v1/admin/notifications/{id}   (edit a PENDING row)
//
// Only the POST survives, and its contract changed completely. The API now
// exposes a single fire-and-forget push broadcast:
//   POST /v1/admin/notifications   body: { title, body, userIds? }
//
// There is no list endpoint, so there is no notification history to show, and
// no scheduling — a broadcast is sent immediately. The table, the pagination,
// the status badges and the edit modal were removed because nothing on the API
// can populate or serve them.
// ─────────────────────────────────────────────────────────────────────────────

const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required").max(120, "Keep the title under 120 characters"),
  body: z.string().min(1, "Message is required").max(500, "Keep the message under 500 characters"),
  // Comma/whitespace separated user IDs. Empty = broadcast to every user.
  userIds: z.string(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

function parseUserIds(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function NotificationsList() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { title: "", body: "", userIds: "" },
  });

  const recipients = parseUserIds(watch("userIds") ?? "");
  const isBroadcastToAll = recipients.length === 0;

  const mut = useMutation({
    mutationFn: (values: BroadcastFormValues) => {
      const ids = parseUserIds(values.userIds);
      return adminControllerBroadcast({
        title: values.title,
        body: values.body,
        ...(ids.length > 0 ? { userIds: ids } : {}),
      });
    },
    onSuccess: () => {
      setServerError(null);
      reset({ title: "", body: "", userIds: "" });
      setSuccessMsg("Broadcast sent.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err) => {
      setSuccessMsg(null);
      setServerError((err as Error).message ?? "Failed to send broadcast");
    },
  });

  function onSubmit(values: BroadcastFormValues) {
    mut.mutate(values);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h2 className="text-base font-bold text-gada-dark">Send Notification</h2>
          <p className="text-xs text-gada-text-muted mt-0.5">
            Sends a push notification immediately. There is no scheduling and no
            delivery history — the API does not store or list sent broadcasts.
          </p>
        </div>

        {successMsg && (
          <div className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
            {successMsg}
          </div>
        )}

        {serverError && (
          <div className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 max-w-xl">
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-xs font-medium text-gada-text-primary">
              Title <span className="text-gada-danger">*</span>
            </label>
            <input
              {...register("title")}
              id="title"
              type="text"
              placeholder="e.g. Scheduled maintenance tonight"
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            />
            {errors.title && <p className="text-xs text-gada-danger">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="body" className="text-xs font-medium text-gada-text-primary">
              Message <span className="text-gada-danger">*</span>
            </label>
            <textarea
              {...register("body")}
              id="body"
              rows={4}
              placeholder="The message shown in the push notification."
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2 resize-y"
            />
            {errors.body && <p className="text-xs text-gada-danger">{errors.body.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="userIds" className="text-xs font-medium text-gada-text-primary">
              Recipients
            </label>
            <textarea
              {...register("userIds")}
              id="userIds"
              rows={2}
              placeholder="Leave empty to send to all users, or paste user IDs separated by commas."
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2 resize-y"
            />
            <p className="text-xs text-gada-text-muted">
              {isBroadcastToAll
                ? "Will be sent to every user on the platform."
                : `Will be sent to ${recipients.length} specific user${recipients.length === 1 ? "" : "s"}.`}
            </p>
            {errors.userIds && <p className="text-xs text-gada-danger">{errors.userIds.message}</p>}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={mut.isPending || isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-dark disabled:opacity-50"
            >
              {mut.isPending
                ? "Sending…"
                : isBroadcastToAll
                  ? "Send to all users"
                  : "Send broadcast"}
            </button>
            <button
              type="button"
              onClick={() => reset({ title: "", body: "", userIds: "" })}
              disabled={mut.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gada-border-light text-gada-text-primary disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
