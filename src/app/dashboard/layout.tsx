/**
 * Dashboard Layout
 *
 * This Server Component wraps all /dashboard/* pages with:
 * - The fixed sidebar (Sidebar component)
 * - A main content area with a top bar
 *
 * Auth is enforced by middleware — by the time this layout renders,
 * the user is guaranteed to be authenticated.
 */

import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed sidebar — 256px wide */}
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
