"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAdminControllerGetEventDetail,
  adminControllerApproveEvent,
  adminControllerDeclineEvent,
  getAdminControllerGetEventDetailQueryKey,
  getAdminControllerGetEventsQueryKey,
} from "@/lib/api/generated/admin/admin";
import type { AdminEventDetail } from "@/lib/api/types/admin";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

interface Props {
  id: string;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB"); } catch { return iso; }
}

function koboToNaira(kobo: number): string {
  return `₦ ${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function EventDetailView({ id }: Props) {
  const queryClient = useQueryClient();

  const { data: raw, isLoading, isError, refetch } =
    useAdminControllerGetEventDetail(id);

  const event = raw as unknown as AdminEventDetail | undefined;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: getAdminControllerGetEventDetailQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getAdminControllerGetEventsQueryKey() });
  };

  // Use useMutation directly — the generated wrappers infer TData as a complex
  // union that confuses TypeScript's narrowing and collapses the result to never.
  const approveMut = useMutation({
    mutationFn: () => adminControllerApproveEvent(id),
    onSuccess: invalidateBoth,
  });

  const declineMut = useMutation({
    mutationFn: () => adminControllerDeclineEvent(id, {}),
    onSuccess: invalidateBoth,
  });

  const isMutating = approveMut.isPending || declineMut.isPending;

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

  const eventInfo = [
    { label: "Event Name",            value: event.title },
    { label: "Convener",              value: event.convener?.name    ?? "—" },
    { label: "Email",                 value: event.convener?.email   ?? "—" },
    { label: "Phone Number",          value: event.convener?.phone   ?? "—" },
    { label: "Event Date",            value: formatDate(event.startDate) },
    { label: "Ticket Type",           value: event.ticketType ?? "—" },
    { label: "Total Ticket Created",  value: event.tickets?.reduce((s, t) => s + t.quantity, 0) ?? "—" },
    { label: "Total Assignees",       value: event.assignees?.length ?? "—" },
  ];

  // Generated hooks type TError as void; use isError + isPending flags instead
  const mutationErrorMsg: string | null =
    approveMut.isError ? "Could not approve event. Please try again." :
    declineMut.isError ? "Could not decline event. Please try again." : null;

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

          {/* Banner image */}
          <div className="relative w-full rounded-xl overflow-hidden mb-5" style={{ height: 220 }}>
            {event.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.coverImage}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full relative"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f59e0b 100%)" }}
              >
                <div
                  className="absolute inset-0 flex items-end justify-center pb-6"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }}
                >
                  <span className="text-white font-semibold text-lg tracking-wide">
                    {event.title}
                  </span>
                </div>
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 20% 80%, rgba(255,165,0,0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(200,0,200,0.3) 0%, transparent 50%), linear-gradient(180deg, #1a0533 0%, #3d0f6b 40%, #7c1a6b 70%, #c45c1a 100%)",
                  }}
                />
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
                        <span className="text-gray-400">({ticket.quantity})</span>
                      </span>
                      {ticket.ticketCategory && (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: "#ef4444" }}
                        >
                          {ticket.ticketCategory}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                      {ticket.price === 0 ? "Free" : koboToNaira(ticket.price)}
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
                <span className="text-xs text-gray-400">
                  {event.location?.address ?? "Location not set"}
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

        {/* Right column: Assignees + Description */}
        <div className="flex flex-col gap-5">
          {/* Assignees */}
          <div className="rounded-xl p-5" style={{ backgroundColor: "#ffffff" }}>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Assignees</h3>
            {event.assignees && event.assignees.length > 0 ? (
              <div className="flex flex-col gap-2">
                {event.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <ArrowRight size={14} color="#9ca3af" />
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: "#6b7280" }}
                    >
                      {a.name.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm text-gray-700 font-medium truncate">{a.name}</span>
                    <span
                      className="px-2.5 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
                      style={{ backgroundColor: "#f59e0b" }}
                    >
                      {a.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No assignees.</p>
            )}
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

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 pb-2">
        <button
          disabled={isMutating}
          onClick={() => approveMut.mutate()}
          className="py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#22c55e" }}
        >
          {approveMut.isPending ? "Approving…" : "Approve"}
        </button>
        <button
          disabled={isMutating}
          onClick={() => declineMut.mutate()}
          className="py-3.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#ffffff", color: "#ef4444", border: "2px solid #ef4444" }}
        >
          {declineMut.isPending ? "Declining…" : "Decline"}
        </button>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between text-xs text-gray-400 pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
