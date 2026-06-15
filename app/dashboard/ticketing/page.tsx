import { Suspense } from "react";
import TicketsList from "@/components/TicketsList";
import Spinner from "@/components/ui/Spinner";

export default function TicketingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <TicketsList />
    </Suspense>
  );
}
