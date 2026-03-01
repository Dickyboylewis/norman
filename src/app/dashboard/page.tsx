/**
 * Main Dashboard Page
 *
 * This is the primary view at /dashboard.
 * It renders the top bar and a responsive 3-column grid of widgets:
 *   - QuickBooks Income Planner (spans 2 columns on large screens)
 *   - Monday.com Leads Summary
 *   - Notion Action Items
 *
 * All widgets are Client Components that fetch their own data via TanStack Query.
 * This page itself is a Server Component (no "use client" directive).
 */

import { TopBar } from "@/components/dashboard/topbar";
import { QuickBooksWidget } from "@/components/dashboard/widgets/quickbooks-widget";
import { MondayWidget } from "@/components/dashboard/widgets/monday-widget";
import { NotionWidget } from "@/components/dashboard/widgets/notion-widget";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  // Fetch the session server-side for the greeting
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar */}
      <TopBar
        title="Dashboard"
        subtitle={`Good ${getTimeOfDay()}, ${firstName} 👋`}
      />

      {/* Page Content */}
      <div className="flex-1 p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Operations Overview
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your live snapshot from QuickBooks, Monday.com, and Notion.
          </p>
        </div>

        {/*
         * Widget Grid
         *
         * Layout:
         *   Mobile (< lg):  1 column, all widgets stacked
         *   Desktop (≥ lg): 3 columns
         *     - QuickBooks: spans 2 cols (wide chart widget)
         *     - Monday:     1 col
         *     - Notion:     1 col (starts new row, spans 1 col)
         *
         * To change the layout, adjust the col-span-* classes on each widget.
         */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* QuickBooks — Income Planner (wide) */}
          <div className="lg:col-span-2">
            <QuickBooksWidget />
          </div>

          {/* Monday.com — Leads Summary */}
          <div className="lg:col-span-1">
            <MondayWidget />
          </div>

          {/* Notion — Action Items (full width on its row) */}
          <div className="lg:col-span-1">
            <NotionWidget />
          </div>

          {/* ─── Add more widgets here ─────────────────────────────────────
           *
           * Example: Add a new widget in the remaining 2 columns:
           *
           * <div className="lg:col-span-2">
           *   <YourNewWidget />
           * </div>
           *
           * ──────────────────────────────────────────────────────────────── */}
        </div>
      </div>
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
