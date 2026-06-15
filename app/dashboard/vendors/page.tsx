import { Suspense } from "react";
import VendorsList from "@/components/VendorsList";
import Spinner from "@/components/ui/Spinner";

export default function VendorsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <VendorsList />
    </Suspense>
  );
}
