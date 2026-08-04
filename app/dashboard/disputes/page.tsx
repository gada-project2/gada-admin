import { Suspense } from "react";
import DisputesList from "@/components/DisputesList";
import Spinner from "@/components/ui/Spinner";

export default function DisputesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <DisputesList />
    </Suspense>
  );
}
