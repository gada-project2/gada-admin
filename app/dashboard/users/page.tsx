import { Suspense } from "react";
import UsersList from "@/components/UsersList";
import Spinner from "@/components/ui/Spinner";

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <UsersList />
    </Suspense>
  );
}
