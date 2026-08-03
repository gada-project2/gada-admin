"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAdminControllerGetEvent,
  adminControllerSuspendEvent,
  adminControllerDeleteEvent,
  getAdminControllerGetEventQueryKey,
  getAdminControllerListEventsQueryKey,
} from "@/lib/api/generated/admin/admin";
import type { AdminEventDetail } from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
import { keyToUrl } from "@/lib/utils/media";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

interface Props {
  id: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

export default function EventDetailView({ id }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [suspendReason, setSuspendReason] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  const { data: raw, isLoading, isError, refetch } =
    useAdminControllerGetEvent(id);

  const event = raw as unknown as AdminEventDetail | undefined;

  // ── Mutations ──────────────────────────────────────────────────────────────
  //
  // WORKFLOW CHANGE: the admin approve/decline endpoints were removed from the
  // API entirely — there is no admin approval step for events anymore. The only
  // admin actions that exist now are:
  //   PATCH  /v1/admin/events/{id}/suspend  (reversible-ish, takes a reason)
  //   DELETE /v1/admin/events/{id}          (permanent)

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: getAdminControllerGetEventQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getAdminControllerListEventsQueryKey() });
  };

  // Use useMutation directly — the generated wrappers infer TData as a complex
  // union that confuses TypeScript's narrowing and collapses the result to never.
  const suspendMut = useMutation({
    mutationFn: () =>
      adminControllerSuspendEvent(id, suspendReason.trim() ? { reason: suspendReason.trim() } : {}),
    onSuccess: () => {
      setSuspendReason("");
      invalidateBoth();
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => adminControllerDeleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getAdminControllerListEventsQueryKey() });
      router.push("/dashboard/event-moderation");
    },
  });

  const isMutating = suspendMut.isPending || deleteMut.isPending;

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/event-moderation"
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Events
        </Link>
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load event details." onRetry={refetch} />
        </div>
      </div>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────

  // The API exposes no phone number or assignee list for an event, and ticket
  // "type" lives per-tier rather than on the event, so those rows are gone.
  const bannerUrl = keyToUrl(event.bannerKey);

  const eventInfo = [
    { label: "Event Name",           value: event.name },
    { label: "Status",               value: event.status },
    { label: "Category",             value: event.category },
    { label: "Convener",             value: event.convener?.displayName ?? "—" },
    { label: "Email",                value: event.convener?.email ?? "—" },
    { label: "Event Date",           value: formatDate(event.startDate) },
    { label: "Venue",                value: event.venue ?? "—" },
    { label: "Total Ticket Created", value: event.tickets?.reduce((s, t) => s + t.quantity, 0) ?? "—" },
    { label: "Tickets Sold",         value: event.ticketsSold },
    { label: "Checked In",           value: event.checkedInCount },
    { label: "Revenue",              value: formatNaira(event.totalRevenue) },
  ];

  // Generated hooks type TError as void; use isError + isPending flags instead
  const mutationErrorMsg: string | null =
    suspendMut.isError ? "Could not suspend event. Please try again." :
    deleteMut.isError ? "Could not delete event. Please try again." : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Back link */}
      <Link
        href="/dashboard/event-moderation"
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Back to Events
      </Link>

      {/* Mutation error banner */}
      {mutationErrorMsg && (
        <div
          className="px-4 py-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
        >
          {mutationErrorMsg}
        </div>
      )}

      {/* Main card */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
        <div className="p-5">
          <h2 className="text-base font-bold text-gray-800 mb-4">Event Info</h2>

          {/* Banner. bannerKey is a storage key — keyToUrl() resolves it.
              When there is no banner (or the image fails to load) we fall back
              to the gradient rather than leaving a broken image icon. */}
          <div className="relative w-full rounded-xl overflow-hidden mb-5" style={{ height: 220 }}>
            {bannerUrl && !bannerFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerUrl}
                alt={`${event.name} banner`}
                className="w-full h-full object-cover"
                onError={() => setBannerFailed(true)}
              />
            ) : (
              <div
                className="w-full h-full relative"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f59e0b 100%)" }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 20% 80%, rgba(255,165,0,0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(200,0,200,0.3) 0%, transparent 50%), linear-gradient(180deg, #1a0533 0%, #3d0f6b 40%, #7c1a6b 70%, #c45c1a 100%)",
                  }}
                />
                <div
                  className="absolute inset-0 flex items-end justify-center pb-6"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }}
                >
                  <span className="text-white font-semibold text-lg tracking-wide">
                    {event.name}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Info table */}
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: "#f3f4f6" }}>
            {eventInfo.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-2"
                style={{ borderBottom: i < eventInfo.length - 1 ? "1px solid #f3f4f6" : "none" }}
              >
                <div className="px-4 py-3 text-sm text-gray-400 font-medium" style={{ borderRight: "1px solid #f3f4f6" }}>
                  {row.label}
                </div>
                <div className="px-4 py-3 text-sm font-semibold text-gray-800">{String(row.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column: Tickets + Location */}
        <div className="flex flex-col gap-5">
          {/* Tickets Created */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "#ffffff" }}>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Ticket Created</h3>
            {event.tickets && event.tickets.length > 0 ? (
              <div className="flex flex-col gap-2">
                {event.tickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center gap-3">
                    <ArrowRight size={14} color="#9ca3af" />
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#fef3c7" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                        <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-700 font-medium">
                        {ticket.name}{" "}
                        <span className="text-gray-400">
                          ({ticket.sold}/{ticket.quantity} sold)
                        </span>
                      </span>
                      {ticket.type && (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: ticket.type === "FREE" ? "#6b7280" : "#ef4444" }}
                        >
                          {ticket.type}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                      {ticket.priceKobo === 0 ? "Free" : formatNaira(ticket.priceKobo)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No tickets created.</p>
            )}
          </div>

          {/* Location */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "#ffffff" }}>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Location</h3>
            <div
              className="rounded-xl overflow-hidden relative"
              style={{ height: 180, backgroundColor: "#e5e7eb" }}
            >
              <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span className="text-xs text-gray-400 px-4 text-center">
                  {[event.venue, event.address, event.city, event.state, event.country]
                    .filter(Boolean)
                    .join(", ") || "Location not set"}
                </span>
              </div>
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(#9ca3af 1px, transparent 1px), linear-gradient(90deg, #9ca3af 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right column: Engagement + Description */}
        <div className="flex flex-col gap-5">
          {/* Engagement.
              Replaces the old "Assignees" panel — the admin event payload carries no
              assignee list, but it does carry these real engagement counters. */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "#ffffff" }}>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Engagement</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "Tickets sold", value: event.ticketsSold.toLocaleString() },
                { label: "Checked in", value: event.checkedInCount.toLocaleString() },
                { label: "Interested", value: event.interestedCount.toLocaleString() },
                {
                  label: "Capacity",
                  value: event.maxAttendees ? event.maxAttendees.toLocaleString() : "Unlimited",
                },
                { label: "Revenue", value: formatNaira(event.totalRevenue) },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <ArrowRight size={14} color="#9ca3af" />
                  <span className="flex-1 text-sm text-gray-700 font-medium">{row.label}</span>
                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "#ffffff" }}>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Description</h3>
            <div
              className="rounded-xl p-4 text-sm text-gray-600 leading-relaxed"
              style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6" }}
            >
              {event.description ?? "No description provided."}
            </div>
          </div>
        </div>
      </div>

      {/* Admin actions.
          Approve / Decline are GONE — the API removed the admin approval workflow.
          What remains is Suspend (takes an optional reason) and Delete (permanent). */}
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#ffffff" }}>
        <div>
          <h3 className="text-sm font-bold text-gray-800">Admin Actions</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Events are published by their convener — there is no admin approval step.
          </p>
        </div>

        {/* Suspend */}
        <div className="flex flex-col gap-2">
          <label htmlFor="suspend-reason" className="text-xs font-medium text-gray-600">
            Reason (optional, shown to the convener)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="suspend-reason"
              type="text"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Violates community guidelines"
              className="flex-1 border rounded-lg px-3 py-2.5 text-sm"
              style={{ borderColor: "#e5e7eb" }}
            />
            <button
              disabled={isMutating || event.status === "SUSPENDED"}
              onClick={() => suspendMut.mutate()}
              className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              style={{ backgroundColor: "#f59e0b" }}
            >
              {suspendMut.isPending
                ? "Suspending…"
                : event.status === "SUSPENDED"
                  ? "Already suspended"
                  : "Suspend Event"}
            </button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #f3f4f6" }} className="pt-4">
          {confirmingDelete ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="flex-1 text-sm font-medium" style={{ color: "#b91c1c" }}>
                Permanently delete “{event.name}”? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={isMutating}
                  onClick={() => setConfirmingDelete(false)}
                  className="py-2.5 px-4 rounded-lg font-semibold text-sm border disabled:opacity-50"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }}
                >
                  Cancel
                </button>
                <button
                  disabled={isMutating}
                  onClick={() => deleteMut.mutate()}
                  className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  {deleteMut.isPending ? "Deleting…" : "Yes, delete permanently"}
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={isMutating}
              onClick={() => setConfirmingDelete(true)}
              className="py-2.5 px-5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#ffffff", color: "#ef4444", border: "2px solid #ef4444" }}
            >
              Delete Event
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between text-xs text-gray-400 pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
