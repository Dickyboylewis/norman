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
import { CashflowCard } from "@/components/dashboard/widgets/cashflow-card";

export default async function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar */}
      <TopBar />

      {/* Page Content */}
      <div className="flex-1 p-8 bg-gray-50">
        {/* 2x2 Grid Layout for Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Viewport 1: Income Planner */}
          <IncomePlannerChart />

          {/* Viewport 2: Prospecting */}
          <ProspectingChart />

          {/* Viewport 3: Deal Revenue */}
          <DealRevenueChart />

          {/* Viewport 4: Cashflow Balance */}
          <CashflowCard />
        </div>
      </div>
    </div>
  );
}
