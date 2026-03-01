/**
 * Next.js Middleware — Route Protection
 *
 * This middleware runs on every request that matches the `config.matcher` below.
 * It uses the NextAuth `auth` function to check if the user is authenticated.
 *
 * The actual authorization logic lives in the `authorized` callback in src/lib/auth.ts.
 * - Unauthenticated users trying to access /dashboard/* are redirected to /login
 * - Authenticated users trying to access /login are redirected to /dashboard
 */

export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT for:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico   (favicon)
     * - public folder files (images, etc.)
     *
     * This ensures the middleware only runs on actual page/API routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
