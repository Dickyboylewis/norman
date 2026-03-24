/**
 * Main Dashboard Page
 *
 * Styled with White Red branding:
 * - Clean white/light grey background
 * - Brand red (#DA2C26) accents on headings and decorative elements
 * - Poppins/Roboto typography
 */

import { TopBar } from "@/components/dashboard/topbar";
import { IncomePlannerChart } from "@/components/dashboard/widgets/income-planner-chart";
import { ProspectingChart } from "@/components/dashboard/widgets/prospecting-chart";
import { DealRevenueChart } from "@/components/dashboard/widgets/deal-revenue-chart";
import { NetProfitWidget } from "@/components/dashboard/widgets/net-profit-widget";
import PushManager from "@/components/PushManager";

export default async function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar */}
      <TopBar />

      {/* Page Content */}
      <div className="flex-1 p-4 md:p-8 bg-gray-50">
        {/* Notification Banner */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-gray-800">Push Notifications</p>
            <p className="text-xs text-gray-500">Stay up to date with real-time alerts from White Red Hub.</p>
          </div>
          <PushManager />
        </div>

        {/* 2x2 Grid Layout for Charts — single column on mobile, 2-col on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Viewport 1: Income Planner */}
          <IncomePlannerChart />

          {/* Viewport 2: Prospecting */}
          <ProspectingChart />

          {/* Viewport 3: Deal Revenue */}
          <DealRevenueChart />

          {/* Viewport 4: 6 Month Net Profit */}
          <NetProfitWidget />
        </div>
      </div>
    </div>
  );
}
