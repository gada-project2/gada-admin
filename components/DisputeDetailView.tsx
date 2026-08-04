"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAdminControllerGetDispute,
  useAdminControllerListAdmins,
  useAdminControllerGetPurchase,
  adminControllerAddDisputeMessage,
  adminControllerChangeDisputeStatus,
  adminControllerResolveDispute,
  getAdminControllerGetDisputeQueryKey,
  getAdminControllerListDisputesQueryKey,
} from "@/lib/api/generated/admin/admin";
import type {
  DisputeDetail,
  DisputeStatus,
  DisputeThreadMessage,
  AddDisputeMessageResult,
  AdminUser,
  AdminPurchaseDetail,
} from "@/lib/api/types/admin";
import type { ResolveDisputeDto } from "@/lib/api/generated/model/resolveDisputeDto";
import { formatNaira } from "@/lib/utils/format";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

interface Props {
  id: string;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

const STATUS_STYLE: Record<DisputeStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: DisputeStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{titleCase(status)}</span>;
}

const RESOLUTION_PRESETS = ["Refund Issued", "No Action", "Escalated", "Rejected", "Other"] as const;

// ─── Resolve modal ──────────────────────────────────────────────────────────

function ResolveModal({
  dispute,
  onClose,
}: {
  dispute: DisputeDetail;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<(typeof RESOLUTION_PRESETS)[number]>("No Action");
  const [customAction, setCustomAction] = useState("");
  const [resolution, setResolution] = useState("");
  const [refundNaira, setRefundNaira] = useState("");

  const showRefundField = preset === "Refund Issued";
  const hasPurchase = !!dispute.purchase;

  // Prefill with the real remaining refundable balance — fetched only when
  // the refund field is actually shown, from the same endpoint the (nonexistent
  // — see report) purchase refund state lives behind: GET /admin/purchases/{id}.
  const { data: purchaseRaw, isLoading: purchaseLoading } = useAdminControllerGetPurchase(
    dispute.purchase?.id ?? "",
    { query: { enabled: showRefundField && hasPurchase } },
  );
  const purchaseDetail = purchaseRaw as unknown as AdminPurchaseDetail | undefined;

  // Prefill once when the remaining-balance fetch first resolves — adjusted
  // during render (React's recommended pattern) rather than in an effect, so
  // there's no extra render pass and no setState-in-effect lint violation.
  const [prefilledForKobo, setPrefilledForKobo] = useState<number | null>(null);
  if (showRefundField && purchaseDetail && prefilledForKobo !== purchaseDetail.refund.remainingKobo && refundNaira === "") {
    setPrefilledForKobo(purchaseDetail.refund.remainingKobo);
    setRefundNaira((purchaseDetail.refund.remainingKobo / 100).toFixed(2));
  }

  const resolveMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (): Promise<any> => {
      const resolutionAction = preset === "Other" ? customAction.trim() : preset;
      const refundAmountKobo =
        showRefundField && refundNaira ? Math.round(parseFloat(refundNaira) * 100) : undefined;
      const dto: ResolveDisputeDto = {
        resolutionAction,
        resolution: resolution.trim(),
        ...(refundAmountKobo != null ? { refundAmountKobo } : {}),
      };
      return adminControllerResolveDispute(dispute.id, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getAdminControllerGetDisputeQueryKey(dispute.id) });
      queryClient.invalidateQueries({ queryKey: getAdminControllerListDisputesQueryKey() });
      onClose();
    },
  });

  const actionValue = preset === "Other" ? customAction.trim() : preset;
  const refundBlocked = showRefundField && (!hasPurchase || (purchaseDetail && !purchaseDetail.refund.refundable));
  const canSubmit =
    resolution.trim().length >= 10 &&
    actionValue.length > 0 &&
    !refundBlocked &&
    !(showRefundField && (!refundNaira || Number(refundNaira) <= 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-bold text-gada-dark mb-4">Resolve Dispute</h3>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="resolution-action" className="text-xs font-medium text-gada-text-secondary">
              Resolution Action
            </label>
            <select
              id="resolution-action"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value as (typeof RESOLUTION_PRESETS)[number]);
                setRefundNaira("");
              }}
              className="border rounded-lg px-3 py-2 text-sm border-gada-border-light outline-none"
            >
              {RESOLUTION_PRESETS.map((p) => (
                <option key={p} value={p} disabled={p === "Refund Issued" && !hasPurchase}>
                  {p}
                  {p === "Refund Issued" && !hasPurchase ? " (no linked purchase)" : ""}
                </option>
              ))}
            </select>
          </div>

          {preset === "Other" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="resolution-action-other" className="text-xs font-medium text-gada-text-secondary">
                Custom action label
              </label>
              <input
                id="resolution-action-other"
                type="text"
                maxLength={100}
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm border-gada-border-light outline-none"
                placeholder="e.g. Store credit issued"
              />
            </div>
          )}

          {showRefundField && (
            <div className="flex flex-col gap-1">
              <label htmlFor="refund-amount" className="text-xs font-medium text-gada-text-secondary">
                Refund Amount (₦)
              </label>
              <input
                id="refund-amount"
                type="number"
                min={0.01}
                step={0.01}
                value={refundNaira}
                onChange={(e) => setRefundNaira(e.target.value)}
                disabled={!hasPurchase || purchaseLoading}
                className="border rounded-lg px-3 py-2 text-sm border-gada-border-light outline-none disabled:opacity-50"
              />
              {purchaseLoading && <p className="text-xs text-gada-text-muted">Loading remaining balance…</p>}
              {purchaseDetail && (
                <p className="text-xs text-gada-text-muted">
                  Remaining refundable: {formatNaira(purchaseDetail.refund.remainingKobo)}
                  {!purchaseDetail.refund.refundable && " — this payment is not currently refundable."}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="resolution-text" className="text-xs font-medium text-gada-text-secondary">
              Resolution (shown to the filer, min 10 characters)
            </label>
            <textarea
              id="resolution-text"
              rows={4}
              maxLength={2000}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm border-gada-border-light outline-none resize-none"
              placeholder="Explain the outcome to the person who filed this dispute…"
            />
          </div>

          {resolveMut.isError && (
            <div className="px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200">
              Could not resolve this dispute. Please try again.
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={onClose}
              disabled={resolveMut.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gada-border-light text-gada-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => resolveMut.mutate()}
              disabled={!canSubmit || resolveMut.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-dark disabled:opacity-50"
            >
              {resolveMut.isPending ? "Resolving…" : "Resolve Dispute"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DisputeDetailView({ id }: Props) {
  const queryClient = useQueryClient();

  const [replyBody, setReplyBody] = useState("");
  const [statusChoice, setStatusChoice] = useState<DisputeStatus | "">("");
  const [resolveOpen, setResolveOpen] = useState(false);

  const { data: raw, isLoading, isError, refetch } = useAdminControllerGetDispute(id);
  const dispute = raw as unknown as DisputeDetail | undefined;

  // Flat, unpaginated (verified against source — no pagination on GET
  // /admin/admins), used purely to resolve an ADMIN message's senderId to a
  // real name. This is the admin's own tool, so senders are identified for
  // real — unlike the mobile app's "Support Team" anonymization.
  const { data: adminsRaw } = useAdminControllerListAdmins();
  const admins = adminsRaw as unknown as AdminUser[] | undefined;
  const adminsById = useMemo(() => {
    const map = new Map<string, AdminUser>();
    (admins ?? []).forEach((a) => map.set(a.id, a));
    return map;
  }, [admins]);

  // Keep the status-change dropdown in sync with the fetched/patched status —
  // adjusted during render rather than in an effect (same reasoning as the
  // refund prefill above). Re-syncs whenever the dispute's actual status
  // changes (e.g. after a mutation), but doesn't fight the admin's own
  // in-progress dropdown selection otherwise.
  const [syncedStatus, setSyncedStatus] = useState<DisputeStatus | null>(null);
  if (dispute && syncedStatus !== dispute.status) {
    setSyncedStatus(dispute.status);
    setStatusChoice(dispute.status);
  }

  const sendMut = useMutation({
    mutationFn: () =>
      adminControllerAddDisputeMessage(id, { body: replyBody.trim() }) as unknown as Promise<AddDisputeMessageResult>,
    onSuccess: (result) => {
      setReplyBody("");
      // Patch the cache directly instead of a full refetch — appends the new
      // message and, if the backend auto-transitioned OPEN → UNDER_REVIEW,
      // reflects that immediately too.
      queryClient.setQueryData(getAdminControllerGetDisputeQueryKey(id), (old: unknown) => {
        if (!old) return old;
        const prev = old as DisputeDetail;
        const newMessage: DisputeThreadMessage = {
          id: result.id,
          disputeId: result.disputeId,
          senderId: result.senderId,
          senderType: result.senderType,
          body: result.body,
          createdAt: result.createdAt,
        };
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
          status: result.autoTransitioned ? "UNDER_REVIEW" : prev.status,
        };
      });
      queryClient.invalidateQueries({ queryKey: getAdminControllerListDisputesQueryKey() });
    },
  });

  const statusMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (status: DisputeStatus): Promise<any> =>
      adminControllerChangeDisputeStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getAdminControllerGetDisputeQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getAdminControllerListDisputesQueryKey() });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !dispute) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/disputes"
          className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Disputes
        </Link>
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load dispute details." onRetry={refetch} />
        </div>
      </div>
    );
  }

  const isTerminal = dispute.status === "RESOLVED" || dispute.status === "REJECTED";

  function senderLabel(msg: DisputeThreadMessage): string {
    if (msg.senderType === "ADMIN") {
      const a = adminsById.get(msg.senderId);
      return a ? `${a.name} (admin)` : "Admin";
    }
    return dispute!.filedBy?.displayName ?? dispute!.filedBy?.email ?? "User";
  }

  const resolvedByAdmin = dispute.resolvedByAdminId ? adminsById.get(dispute.resolvedByAdminId) : undefined;

  return (
    <div className="flex flex-col gap-5">
      {resolveOpen && <ResolveModal dispute={dispute} onClose={() => setResolveOpen(false)} />}

      <Link
        href="/dashboard/disputes"
        className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Back to Disputes
      </Link>

      {/* Header */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap justify-between">
          <h2 className="text-lg font-bold text-gada-dark">{dispute.subject}</h2>
          <StatusBadge status={dispute.status} />
        </div>
        <p className="text-sm text-gada-text-muted">{dispute.description}</p>
        <div className="text-sm text-gada-text-secondary">
          Filed by{" "}
          {dispute.filedBy ? (
            <Link href={`/dashboard/users/${dispute.filedBy.id}`} className="font-medium hover:underline" style={{ color: "#f59e0b" }}>
              {dispute.filedBy.displayName ?? dispute.filedBy.email}
            </Link>
          ) : (
            "—"
          )}
          {dispute.filedBy?.email && dispute.filedBy.displayName && (
            <span className="text-gada-text-muted"> ({dispute.filedBy.email})</span>
          )}
          {" · "}
          {titleCase(dispute.type)} · Filed {formatDateTime(dispute.createdAt)}
        </div>
      </div>

      {/* Context / anchor card */}
      {(dispute.purchase || dispute.eventPayout || dispute.vendorBooth || dispute.event) && (
        <div className="rounded-xl p-5 bg-white flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gada-dark">Context</h3>

          {dispute.purchase && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gada-text-secondary">Purchase</span>
              <span className="text-gada-text-muted">
                {formatNaira(dispute.purchase.totalKobo)} · Qty {dispute.purchase.quantity} · {titleCase(dispute.purchase.status)}
                {dispute.purchase.event && (
                  <>
                    {" · "}
                    <Link
                      href={`/dashboard/event-moderation/${dispute.purchase.event.id}`}
                      className="hover:underline"
                      style={{ color: "#f59e0b" }}
                    >
                      {dispute.purchase.event.name}
                    </Link>
                  </>
                )}
              </span>
              {/* No Purchase Detail page exists in this app — nothing else to link here. */}
            </div>
          )}

          {dispute.eventPayout && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gada-text-secondary">Settlement</span>
              <span className="text-gada-text-muted">
                {formatNaira(dispute.eventPayout.amountKobo)} · {titleCase(dispute.eventPayout.status)}
                {" · "}
                <Link href={`/dashboard/settlements/${dispute.eventPayout.id}`} className="hover:underline" style={{ color: "#f59e0b" }}>
                  View settlement
                </Link>
              </span>
            </div>
          )}

          {dispute.vendorBooth && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gada-text-secondary">Vendor Booth</span>
              <span className="text-gada-text-muted">
                {dispute.vendorBooth.boothNo ? `Booth ${dispute.vendorBooth.boothNo}` : "No booth number"}
                {dispute.vendorBooth.event && (
                  <>
                    {" · "}
                    <Link
                      href={`/dashboard/event-moderation/${dispute.vendorBooth.event.id}`}
                      className="hover:underline"
                      style={{ color: "#f59e0b" }}
                    >
                      {dispute.vendorBooth.event.name}
                    </Link>
                  </>
                )}
              </span>
              {/* The booth anchor carries no vendorId, so there is nothing here
                  to link to the Vendor Detail page. */}
            </div>
          )}

          {dispute.event && !dispute.purchase?.event && !dispute.vendorBooth?.event && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-gada-text-secondary">Event</span>
              <Link href={`/dashboard/event-moderation/${dispute.event.id}`} className="hover:underline w-fit" style={{ color: "#f59e0b" }}>
                {dispute.event.name}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Message thread */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gada-dark">Messages</h3>

        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
          {dispute.messages.length === 0 && (
            <p className="text-sm text-gada-text-muted">No messages yet.</p>
          )}
          {dispute.messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-3 text-sm ${
                msg.senderType === "ADMIN" ? "bg-blue-50 ml-6" : "bg-gray-50 mr-6"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-gada-dark">{senderLabel(msg)}</span>
                <span className="text-xs text-gada-text-muted whitespace-nowrap">{formatDateTime(msg.createdAt)}</span>
              </div>
              <p className="text-gada-text-secondary whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-gada-border-light">
          <textarea
            rows={3}
            maxLength={2000}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply…"
            className="border rounded-lg px-3 py-2 text-sm border-gada-border-light outline-none resize-none"
          />
          {sendMut.isError && (
            <p className="text-xs font-medium text-red-600">Could not send message. Please try again.</p>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => sendMut.mutate()}
              disabled={sendMut.isPending || replyBody.trim().length === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-dark disabled:opacity-50"
            >
              {sendMut.isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* Resolution — terminal-state summary once RESOLVED/REJECTED,
          otherwise the Resolve action. */}
      {isTerminal ? (
        <div className="rounded-xl p-5 bg-white flex flex-col gap-2">
          <h3 className="text-sm font-bold text-gada-dark">Resolution</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={dispute.status} />
            {dispute.resolutionAction && (
              <span className="text-sm font-medium text-gada-text-secondary">{dispute.resolutionAction}</span>
            )}
          </div>
          {dispute.resolution && <p className="text-sm text-gada-text-muted">{dispute.resolution}</p>}
          <p className="text-xs text-gada-text-muted">
            Resolved {formatDateTime(dispute.resolvedAt)}
            {resolvedByAdmin && ` by ${resolvedByAdmin.name}`}
            {dispute.refundPurchaseId && " · refund issued"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl p-5 bg-white flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-bold text-gada-dark">Resolve Dispute</h3>
            <p className="text-xs text-gada-text-muted mt-0.5">
              Close this dispute with a resolution, optionally issuing a refund.
            </p>
          </div>
          <button
            onClick={() => setResolveOpen(true)}
            className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white bg-gada-dark w-fit hover:opacity-90"
          >
            Resolve Dispute
          </button>
        </div>
      )}

      {/* Manual status change — non-terminal moves only. Hidden entirely once
          RESOLVED/REJECTED, matching the backend's USE_RESOLVE_ENDPOINT guard
          (PATCH .../status rejects RESOLVED/REJECTED outright). */}
      {!isTerminal && (
        <div className="rounded-xl p-5 bg-white flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-bold text-gada-dark">Change Status</h3>
            <p className="text-xs text-gada-text-muted mt-0.5">
              Manual override for non-terminal states. Use Resolve above to close this dispute.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={statusChoice}
              onChange={(e) => setStatusChoice(e.target.value as DisputeStatus)}
              className="border rounded-lg px-3 py-2 text-sm border-gada-border-light outline-none"
            >
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under Review</option>
            </select>
            <button
              onClick={() => statusChoice && statusMut.mutate(statusChoice)}
              disabled={statusMut.isPending || !statusChoice || statusChoice === dispute.status}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-accent disabled:opacity-50"
            >
              {statusMut.isPending ? "Updating…" : "Update Status"}
            </button>
          </div>
          {statusMut.isError && (
            <p className="text-xs font-medium text-red-600">Could not update status. Please try again.</p>
          )}
        </div>
      )}

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
