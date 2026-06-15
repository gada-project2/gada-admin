import { Suspense } from "react";
import NotificationsList from "@/components/NotificationsList";
import Spinner from "@/components/ui/Spinner";

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <NotificationsList />
    </Suspense>
  );
}
