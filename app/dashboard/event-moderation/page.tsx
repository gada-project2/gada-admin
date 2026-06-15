import { Suspense } from "react";
import EventModerationList from "@/components/EventModerationList";
import Spinner from "@/components/ui/Spinner";

export default function EventModerationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <EventModerationList />
    </Suspense>
  );
}
