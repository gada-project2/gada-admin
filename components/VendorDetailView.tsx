"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useAdminControllerGetVendor,
  adminControllerSuspendVendor,
  adminControllerRestoreVendor,
  getAdminControllerGetVendorQueryKey,
  getAdminControllerListVendorsQueryKey,
} from "@/lib/api/generated/admin/admin";
import type {
  VendorDetail,
  VendorStatus,
  VendorGalleryImage,
  VendorProduct,
  VendorBooth,
} from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
import { keyToUrl, vendorImageUrl } from "@/lib/utils/media";
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

const STATUS_STYLE: Record<VendorStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: VendorStatus }) {
  const cls = STATUS_STYLE[status] ?? "bg-gada-surface-card text-gada-text-secondary";
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
}

function GalleryTile({ image }: { image: VendorGalleryImage }) {
  const [failed, setFailed] = useState(false);
  const url = keyToUrl(image.imageKey);

  if (!url || failed) {
    return (
      <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">
        No image
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={image.caption ?? "Vendor gallery photo"}
        className="aspect-square w-full rounded-lg object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
      {image.caption && <p className="text-xs text-gada-text-muted truncate">{image.caption}</p>}
    </div>
  );
}

export default function VendorDetailView({ id }: Props) {
  const queryClient = useQueryClient();

  const { data: raw, isLoading, isError, refetch } = useAdminControllerGetVendor(id);
  const vendor = raw as unknown as VendorDetail | undefined;

  // ── Mutations (raw useMutation — generated hooks collapse to never for void
  // responses, same discipline as VendorsList) ──
  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: getAdminControllerGetVendorQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getAdminControllerListVendorsQueryKey() });
  };

  const suspendMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: () => adminControllerSuspendVendor(id) as any,
    onSuccess: invalidateBoth,
  });

  const restoreMut = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: () => adminControllerRestoreVendor(id) as any,
    onSuccess: invalidateBoth,
  });

  const isMutating = suspendMut.isPending || restoreMut.isPending;
  const mutationErrorMsg: string | null =
    suspendMut.isError ? "Could not suspend vendor. Please try again." :
    restoreMut.isError ? "Could not restore vendor. Please try again." : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard/vendors"
          className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Vendors
        </Link>
        <div className="rounded-xl bg-white p-6">
          <ErrorState message="Failed to load vendor details." onRetry={refetch} />
        </div>
      </div>
    );
  }

  const infoRows = [
    { label: "Owner Name", value: vendor.ownerName },
    { label: "Email", value: vendor.email },
    { label: "Phone", value: vendor.phoneNumber ?? "—" },
    { label: "Description", value: vendor.description ?? "—" },
  ];

  const productColumns: Column<VendorProduct>[] = [
    { key: "productName", header: "Name" },
    { key: "priceKobo", header: "Price", render: (row) => formatNaira(row.priceKobo) },
    {
      key: "isAvailable",
      header: "Availability",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${
            row.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {row.isAvailable ? "Available" : "Unavailable"}
        </span>
      ),
    },
  ];

  const boothColumns: Column<VendorBooth>[] = [
    {
      key: "event",
      header: "Event",
      render: (row) =>
        row.event ? (
          <Link
            href={`/dashboard/event-moderation/${row.event.id}`}
            className="text-sm font-medium hover:underline"
            style={{ color: "#f59e0b" }}
          >
            {row.event.name}
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "createdAt", header: "Date", render: (row) => formatDate(row.createdAt) },
    { key: "boothNo", header: "Booth No.", render: (row) => row.boothNo ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/vendors"
        className="flex items-center gap-1.5 text-sm font-medium text-gada-text-muted hover:text-gada-dark transition-colors w-fit"
      >
        ← Back to Vendors
      </Link>

      {mutationErrorMsg && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {mutationErrorMsg}
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl p-5 bg-white flex items-center gap-4 flex-wrap">
        <Avatar url={vendorImageUrl(vendor)} name={vendor.storeName} size={56} rounded="md" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gada-dark truncate">{vendor.storeName}</h2>
          <p className="text-sm text-gada-text-muted truncate">{vendor.email}</p>
        </div>
        <StatusBadge status={vendor.status} />
      </div>

      {/* Info card */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gada-dark">Vendor Info</h3>
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
      </div>

      {/* Gallery — full set, not the list's take:1 fallback preview. */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-gada-dark">Gallery</h3>
          <p className="text-xs text-gada-text-muted mt-0.5">{vendor.gallery.length} photo(s)</p>
        </div>
        {vendor.gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {vendor.gallery.map((image) => (
              <GalleryTile key={image.id} image={image} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gada-text-muted">No gallery photos uploaded.</p>
        )}
      </div>

      {/* Products */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gada-dark">Products</h3>
        <DataTable
          columns={productColumns}
          rows={vendor.products}
          isLoading={false}
          isError={false}
          onRetry={refetch}
          emptyLabel="No products found"
          emptyNote="This vendor has not listed any products."
          meta={{ page: 1, perPage: vendor.products.length || 1, total: vendor.products.length, totalPages: 1 }}
          page={1}
          onPageChange={() => {}}
        />
      </div>

      {/* Booth history */}
      <div className="rounded-xl p-5 bg-white flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gada-dark">Booth History</h3>
        <DataTable
          columns={boothColumns}
          rows={vendor.booths}
          isLoading={false}
          isError={false}
          onRetry={refetch}
          emptyLabel="No booths found"
          emptyNote="This vendor has not booked a booth at any event."
          meta={{ page: 1, perPage: vendor.booths.length || 1, total: vendor.booths.length, totalPages: 1 }}
          page={1}
          onPageChange={() => {}}
        />
      </div>

      {/* Admin actions */}
      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div>
          <h3 className="text-sm font-bold text-gada-dark">Admin Actions</h3>
          <p className="text-xs text-gada-text-muted mt-0.5">
            Suspend or restore this vendor. There is no delete endpoint for vendors.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={isMutating || vendor.status === "SUSPENDED"}
            onClick={() => suspendMut.mutate()}
            className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white bg-gada-accent transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {suspendMut.isPending ? "Suspending…" : vendor.status === "SUSPENDED" ? "Already suspended" : "Suspend Vendor"}
          </button>
          <button
            disabled={isMutating || vendor.status === "ACTIVE"}
            onClick={() => restoreMut.mutate()}
            className="py-2.5 px-5 rounded-lg font-semibold text-sm text-white bg-gada-success transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {restoreMut.isPending ? "Restoring…" : vendor.status === "ACTIVE" ? "Already active" : "Restore Vendor"}
          </button>
        </div>
      </div>

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
