"use client";

import { Menu, ChevronDown } from "lucide-react";
import { useAdmin } from "@/lib/hooks/useAdmin";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Header() {
  const { admin, isLoading } = useAdmin();

  const displayName = isLoading ? "…" : (admin?.name ?? "Admin");
  const displayRole = isLoading ? "…" : (admin?.role ?? "Admin");
  const avatarText = admin ? initials(admin.name) : "—";

  return (
    <header
      className="flex items-center justify-between px-5 py-3 shrink-0"
      style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #ebebeb" }}
    >

      <div className="flex items-center gap-3">
        <button className="p-1 rounded hover:bg-gray-100">
          <Menu size={22} color="#374151" />
        </button>
        <p className="text-sm font-medium text-gray-700">
          Your Role:{" "}
          <span className="font-bold" style={{ color: "#f59e0b" }}>
            {displayRole}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
        <div
          className="w-9 h-9 rounded-full overflow-hidden"
          style={{ backgroundColor: "#6b7280" }}
        >
          <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
            {avatarText}
          </div>
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-800">{displayName}</span>
        </div>
        <ChevronDown size={16} color="#6b7280" />
      </div>
    </header>
  );
}
