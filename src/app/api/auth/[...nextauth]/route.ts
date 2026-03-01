/**
 * NextAuth.js Route Handler
 *
 * This file exposes the NextAuth GET and POST handlers for the
 * /api/auth/* routes (e.g., /api/auth/signin, /api/auth/callback/google).
 *
 * No changes needed here — all configuration lives in src/lib/auth.ts
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
