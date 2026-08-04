"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Store,
  Users,
  UserCircle,
  Ticket,
  Bell,
  Calendar,
  Settings,
  LogOut,
  Wallet,
  Landmark,
  Gavel,
  ShieldAlert,
  ScrollText,
} from "lucide-react";
import { useAdmin } from "@/lib/hooks/useAdmin";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Event Moderation", href: "/dashboard/event-moderation", icon: CheckSquare },
  { label: "Users", href: "/dashboard/users", icon: UserCircle },
  { label: "Vendors", href: "/dashboard/vendors", icon: Store },
  { label: "Conveners", href: "/dashboard/conveners", icon: Users },
  { label: "Ticketing", href: "/dashboard/ticketing", icon: Ticket },
  { label: "Revenue", href: "/dashboard/revenue", icon: Wallet },
  // Settlement visibility is oversight, not a money-movement action or the
  // security-log territory that requires super-admin restriction (see Action
  // Log below) — visible to every admin.
  { label: "Settlements", href: "/dashboard/settlements", icon: Landmark },
  // Same discipline as Settlements: dispute handling is operational admin
  // work, not the sensitive/security territory Action Log is gated for.
  { label: "Disputes", href: "/dashboard/disputes", icon: Gavel },
  { label: "SOS Events", href: "/dashboard/sos", icon: ShieldAlert },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  // superOnly: hidden entirely for regular admins — the backend also enforces
  // this (AdminService.requireSuper on GET /admin/logs), so this is a UX nicety
  // on top of a real server-side guard, not a substitute for it.
  { label: "Action Log", href: "/dashboard/logs", icon: ScrollText, superOnly: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin } = useAdmin();

  // Hidden until super-admin status is positively confirmed — during loading
  // (admin undefined) the item stays hidden rather than flashing then vanishing.
  const visibleNavItems = navItems.filter((item) => !item.superOnly || admin?.isSuperAdmin);

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
        {visibleNavItems.map(({ label, href, icon: Icon }) => {
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
