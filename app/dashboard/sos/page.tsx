import { Suspense } from "react";
import SosList from "@/components/SosList";
import Spinner from "@/components/ui/Spinner";

export default function SosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <SosList />
    </Suspense>
  );
}
