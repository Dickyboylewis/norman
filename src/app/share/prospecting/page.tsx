"use client";

import { useSearchParams, redirect } from "next/navigation";
import { Suspense } from "react";
import { ProspectingChart } from "@/components/dashboard/widgets/prospecting-chart";

function ProspectingPageContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");

  if (key !== "red-white-prospecting-2026") {
    redirect("/");
  }

  // Get current week's date range (Monday to Friday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const weekRange = `${formatDate(monday)} - ${formatDate(friday)}`;
  const todayFormatted = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-8">
      <div className="max-w-3xl w-full rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Red brand bar */}
        <div className="h-2" style={{ backgroundColor: "#E63946" }}></div>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1
              className="text-3xl font-bold text-gray-900 mb-2"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Weekly Prospecting Results 🚀
            </h1>
            <p
              className="text-gray-600 mb-3"
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              {weekRange}
            </p>
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: "#FEE2E2",
                color: "#E63946",
                fontFamily: "Roboto, sans-serif",
              }}
            >
              WHITE RED
            </span>
          </div>

          {/* Graph */}
          <div className="py-6">
            <ProspectingChart />
          </div>

          {/* Footer */}
          <div
            className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-200"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            <span>Auto-generated · wte.red</span>
            <span>{todayFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProspectingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-white" />}>
      <ProspectingPageContent />
    </Suspense>
  );
}
