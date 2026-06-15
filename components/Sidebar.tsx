"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Store,
  Users,
  Ticket,
  Bell,
  Calendar,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Event Moderation", href: "/dashboard/event-moderation", icon: CheckSquare },
  { label: "Vendors", href: "/dashboard/vendors", icon: Store },
  { label: "Conveners", href: "/dashboard/conveners", icon: Users },
  { label: "Ticketing", href: "/dashboard/ticketing", icon: Ticket },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col h-full bg-gada-dark">
      {/* Logo */}
      <div className="flex items-center justify-center py-5 px-4 border-b border-gada-sidebar-divider">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Gada Logo" width={110} height={60} style={{ objectFit: "contain", filter: "brightness(0) invert(1)" }} />
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
        <p className="text-xs font-bold px-3 pb-2 tracking-wider text-gada-text-secondary">MENU</p>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-gada-text-muted hover:bg-white/10"
              }`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gada-text-muted hover:bg-white/10"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
