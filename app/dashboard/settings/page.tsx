import { Suspense } from "react";
import SettingsAdmins from "@/components/SettingsAdmins";
import Spinner from "@/components/ui/Spinner";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} />
        </div>
      }
    >
      <SettingsAdmins />
    </Suspense>
  );
}
