/**
 * Main Dashboard Page
 *
 * Styled with White Red branding:
 * - Clean white/light grey background
 * - Brand red (#DA2C26) accents on headings and decorative elements
 * - Poppins/Roboto typography
 */

import { TopBar } from "@/components/dashboard/topbar";
import { QuickBooksWidget } from "@/components/dashboard/widgets/quickbooks-widget";
import { MondayWidget } from "@/components/dashboard/widgets/monday-widget";
import { NotionWidget } from "@/components/dashboard/widgets/notion-widget";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
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
      <div className="flex-1 p-8 bg-gray-50">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            {/* Brand red accent bar */}
            <div className="w-1 h-7 bg-[#DA2C26] rounded-full flex-shrink-0" />
            <h2
              className="text-2xl font-bold text-[#333333]"
              style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}
            >
              Operations Overview
            </h2>
          </div>
          <p
            className="text-sm text-[#7A7A7A] mt-1 ml-4"
            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
          >
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

          {/* Notion — Action Items */}
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
