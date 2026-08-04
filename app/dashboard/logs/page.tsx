import { Suspense } from "react";
import AdminLogsList from "@/components/AdminLogsList";
import Spinner from "@/components/ui/Spinner";

export default function LogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <AdminLogsList />
    </Suspense>
  );
}
