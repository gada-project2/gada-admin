import { Suspense } from "react";
import GroupsList from "@/components/GroupsList";
import Spinner from "@/components/ui/Spinner";

export default function GroupsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <GroupsList />
    </Suspense>
  );
}
