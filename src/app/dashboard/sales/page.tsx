"use client";

import { Suspense, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TopBar } from "@/components/dashboard/topbar";
import { ProspectingChart } from "@/components/dashboard/widgets/prospecting-chart";
import { DealRevenueChart } from "@/components/dashboard/widgets/deal-revenue-chart";
import { CRMNeuralMap } from "@/components/dashboard/widgets/crm-neural-map";
import { ProspectingHistoryChart } from "@/components/dashboard/widgets/prospecting-history-chart";
import { AskJebPanel } from "@/components/dashboard/ask-jeb/ask-jeb-panel";
import { MessageCircle } from "lucide-react";

export default function SalesPage() {
  const [jebOpen, setJebOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Sales" />

      <div className="flex-1 p-4 md:p-8 bg-gray-50">
        <button
          onClick={() => setJebOpen(true)}
          className="w-full mb-6 group cursor-pointer"
          aria-label="Ask Jeb Blount for sales coaching"
        >
          <div className="flex items-center gap-4 md:gap-5 rounded-xl border-2 border-[#DA2C26] bg-white px-4 py-3 md:px-6 md:py-4 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-[#b52420]">
            <div className="relative flex-shrink-0">
              <img
                src="/Jeb-Blount.png"
                alt="Jeb Blount"
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-3 border-[#DA2C26] shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>

            <div className="flex-1 text-left">
              <h3 className="text-base md:text-lg font-bold text-gray-900 font-[family-name:var(--font-poppins)]">
                Ask Jeb Blount
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Your AI sales coach — prospecting, objections, pipeline strategy
              </p>
            </div>

            <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#DA2C26] flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </button>

        <AskJebPanel isOpen={jebOpen} onClose={() => setJebOpen(false)} />

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
