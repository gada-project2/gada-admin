import { Suspense } from "react";
import ConvenersList from "@/components/ConvenersList";
import Spinner from "@/components/ui/Spinner";

export default function ConvenersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <ConvenersList />
    </Suspense>
  );
}
