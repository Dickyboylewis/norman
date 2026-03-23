/**
 * Dashboard Layout
 *
 * This Server Component wraps all /dashboard/* pages with:
 * - The fixed sidebar (Sidebar component)
 * - A main content area with a top bar
 *
 * Auth is enforced by middleware — by the time this layout renders,
 * the user is guaranteed to be authenticated.
 *
 * Mobile: No left offset (sidebar is hidden), top padding for mobile header
 * Desktop (md+): Left offset of 256px for the fixed sidebar
 */

import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — mobile: hamburger header; desktop: fixed left panel */}
      <Sidebar />

      {/* Main content area:
          - Mobile: no left offset, but add top padding for the 56px mobile header
          - Desktop (md+): offset by sidebar width (256px), no top padding needed */}
      <div className="pt-14 md:pt-0 md:pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
