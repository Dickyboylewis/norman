"use client";

import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TopBar } from "@/components/dashboard/topbar";
import { ProspectingChart } from "@/components/dashboard/widgets/prospecting-chart";
import { DealRevenueChart } from "@/components/dashboard/widgets/deal-revenue-chart";
import { CRMNeuralMap } from "@/components/dashboard/widgets/crm-neural-map";
import { ProspectingHistoryChart } from "@/components/dashboard/widgets/prospecting-history-chart";
import { BDActivityCards } from "@/components/dashboard/widgets/bd-activity-cards";

export default function SalesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Sales" />

      <div className="flex-1 p-4 md:p-8 bg-gray-50">
        <div className="mb-6">
          <BDActivityCards />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 font-[family-name:var(--font-poppins)]">
            Live from Monday.com
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <ProspectingChart />
            <DealRevenueChart />
            <Card className="col-span-1 md:col-span-2">
              <CardContent className="p-0 h-[700px]">
                <Suspense fallback={<div className="h-[700px]" />}>
                  <CRMNeuralMap />
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="w-full mt-6">
          <ProspectingHistoryChart />
        </div>
      </div>
    </div>
  );
}
