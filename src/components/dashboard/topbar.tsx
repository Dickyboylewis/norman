"use client";

/**
 * Dashboard Top Bar
 *
 * Styled with White Red branding:
 * - Clean white background with subtle border
 * - Brand red (#DA2C26) accent on notification dot and active states
 * - Poppins/Roboto typography
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
    queryClient.invalidateQueries();
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 bg-white">
      {/* Left: Logo + Page title */}
      <div className="flex items-center gap-4">
        {/* White-Red Logo */}
        <img
          src="/white-red.svg"
          alt="Norman"
          className="h-8 w-auto"
        />
        <div>
          <h1
            className="text-lg font-semibold text-[#333333] leading-none"
            style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-xs text-[#7A7A7A] mt-0.5"
              style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-3">
        {/* Date */}
        <span
          className="hidden md:block text-xs text-[#7A7A7A]"
          style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
        >
          {dateString}
        </span>

        {/* Refresh all widgets */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-[#7A7A7A] hover:text-[#DA2C26] hover:bg-[#DA2C26]/5 transition-colors"
          onClick={handleRefresh}
          title="Refresh all widgets"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        {/* Notifications (placeholder) */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-[#7A7A7A] hover:text-[#DA2C26] hover:bg-[#DA2C26]/5 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {/* Brand red notification dot */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#DA2C26]" />
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* User avatar */}
        <Avatar className="w-8 h-8">
          <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
          <AvatarFallback className="bg-[#DA2C26] text-white text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
