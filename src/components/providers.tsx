"use client";

/**
 * Providers Component
 *
 * Wraps the app with all necessary client-side context providers:
 * - TanStack Query (React Query) for data fetching
 * - SessionProvider from NextAuth for client-side session access
 *
 * This is a Client Component because providers use React context,
 * which is not available in Server Components.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "next-auth/react";
import { getQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* Remove ReactQueryDevtools in production if desired */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  );
}
