"use client";

import { useAdminControllerListConveners } from "@/lib/api/generated/admin/admin";
import type { Convener, ConvenerListResponse } from "@/lib/api/types/admin";
import { formatNaira } from "@/lib/utils/format";
import { keyToUrl } from "@/lib/utils/media";
import Avatar from "@/components/ui/Avatar";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

// GET /v1/admin/users/conveners has no sort/limit-by-revenue param, so this
// pulls one page and sorts client-side. perPage is capped at 100 server-side —
// fine at the current scale (~5 conveners), but this will silently show only
// the first 100 conveners once the platform exceeds that, not necessarily the
// top-revenue ones. Needs a server-side sort param before that matters.
const FETCH_SIZE = "100";
const TOP_N = 10;

export default function TopConvenersByRevenue() {
  const { data: raw, isLoading, isError, refetch } = useAdminControllerListConveners({
    page: "1",
    perPage: FETCH_SIZE,
  });

  const resp = raw as unknown as ConvenerListResponse | undefined;
  const all = resp?.data ?? [];
  const nearCap = (resp?.meta?.total ?? 0) > Number(FETCH_SIZE);

  const top: Convener[] = [...all]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, TOP_N);

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: "#ffffff" }}>
      <div>
        <h2 className="text-base font-bold text-gray-800">Top Conveners by Revenue</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Ranked by net-of-refund ticket revenue, all time
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Spinner size={28} />
        </div>
      )}

      {isError && <ErrorState message="Failed to load conveners." onRetry={refetch} />}

      {!isLoading && !isError && top.length === 0 && (
        <EmptyState label="No conveners found" note="No users have created events yet." />
      )}

      {!isLoading && !isError && top.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                {["#", "Convener", "Email", "Events", "Revenue"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td className="py-3 px-3 text-xs text-gray-500">{i + 1}</td>
                  <td className="py-3 px-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar url={keyToUrl(c.photoKey)} name={c.displayName} size={26} />
                      <span>{c.displayName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{c.email}</td>
                  <td className="py-3 px-3 text-xs text-gray-500">{c.eventCount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {formatNaira(c.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nearCap && (
        <p className="text-xs" style={{ color: "#ca8a04" }}>
          Showing the first {FETCH_SIZE} conveners only — ranking may be incomplete now that
          the platform has more than {FETCH_SIZE}. Needs a server-side sort param to fix properly.
        </p>
      )}
    </div>
  );
}
