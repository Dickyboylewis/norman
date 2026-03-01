"use client";

/**
 * Dashboard Top Bar
 *
 * A top header bar showing:
 * - Current page title
 * - Live date/time
 * - User avatar (quick access)
 */

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const user = session?.user;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const now = new Date();
  const dateString = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleRefresh = () => {
    // Invalidate all queries to trigger a fresh fetch of all widgets
    queryClient.invalidateQueries();
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {/* Left: Page title */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-3">
        {/* Date */}
        <span className="hidden md:block text-xs text-slate-400 dark:text-slate-500">
          {dateString}
        </span>

        {/* Refresh all widgets */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          onClick={handleRefresh}
          title="Refresh all widgets"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        {/* Notifications (placeholder) */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </Button>

        {/* User avatar */}
        <Avatar className="w-8 h-8">
          <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
          <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
