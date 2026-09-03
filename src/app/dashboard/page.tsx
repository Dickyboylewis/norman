/**
 * Main Dashboard Page
 *
 * Styled with White Red branding:
 * - Clean white/light grey background
 * - Brand red (#DA2C26) accents on headings and decorative elements
 * - Poppins/Roboto typography
 */

import { TopBar } from "@/components/dashboard/topbar";
import { QuoteBanner } from "@/components/dashboard/quote-banner";
import { IncomePlannerChart } from "@/components/dashboard/widgets/income-planner-chart";
import { ProspectingChart } from "@/components/dashboard/widgets/prospecting-chart";
import { DealRevenueChart } from "@/components/dashboard/widgets/deal-revenue-chart";
import { NetProfitWidget } from "@/components/dashboard/widgets/net-profit-widget";

export default async function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />

      <div className="flex-1 p-4 md:p-8 bg-gray-50">
        <div className="mb-6">
          <QuoteBanner />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <IncomePlannerChart />

          <ProspectingChart />

          <DealRevenueChart />

          <NetProfitWidget />
        </div>
      </div>
    </div>
  );
}
