/**
 * TanStack Query — Shared QueryClient factory
 *
 * We create a new QueryClient per request on the server, and a singleton
 * on the client. This follows the recommended Next.js App Router pattern.
 */

import { QueryClient } from "@tanstack/react-query";

// Singleton for the browser
let browserQueryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set a staleTime above 0 to avoid
        // refetching immediately on the client after a server render.
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
