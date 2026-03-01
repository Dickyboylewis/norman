"use client";

/**
 * Dashboard Sidebar
 *
 * A fixed left sidebar styled with White Red branding:
 * - Dark charcoal (#333) background
 * - Brand red (#DA2C26) active states and accents
 * - Poppins/Roboto typography
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderKanban,
  PoundSterling,
  TrendingUp,
  Users,
  Briefcase,
  Monitor,
  Building2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Navigation Items ──────────────────────────────────────────────────────────

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    label: "Finance",
    href: "/dashboard/finance",
    icon: PoundSterling,
  },
  {
    label: "Sales",
    href: "/dashboard/sales",
    icon: TrendingUp,
  },
  {
    label: "HR",
    href: "/dashboard/hr",
    icon: Users,
  },
  {
    label: "Operations",
    href: "/dashboard/operations",
    icon: Briefcase,
  },
  {
    label: "IT",
    href: "/dashboard/it",
    icon: Monitor,
  },
  {
    label: "Premises",
    href: "/dashboard/premises",
    icon: Building2,
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-red-700 text-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-white/10">
        {/* Red logo mark */}
        <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-red-700 font-bold text-sm">N</span>
        </div>
        <div>
          <p className="font-semibold text-sm leading-none text-white">Norman</p>
          <p className="text-xs text-white/50 mt-0.5">Operations Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="px-3 mb-2 text-xs font-medium text-white/70 uppercase tracking-wider">
          Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-red-900 text-white shadow-sm"
                      : "text-white hover:bg-red-800 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Red accent line above user section */}
      <div className="h-px bg-white/20 mx-4" />

      {/* User Profile + Sign Out */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
            <AvatarFallback className="bg-red-900 text-white text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name ?? "Loading..."}
            </p>
            <p className="text-xs text-white/40 truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-white hover:text-white hover:bg-red-800 text-xs"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
