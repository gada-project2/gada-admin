import { Suspense } from "react";
import SettlementsList from "@/components/SettlementsList";
import Spinner from "@/components/ui/Spinner";

export default function SettlementsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <SettlementsList />
    </Suspense>
  );
}
