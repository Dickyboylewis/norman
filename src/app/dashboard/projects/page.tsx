"use client";

import { TopBar } from "@/components/dashboard/topbar";
import profitability from "@/lib/fixtures/profitability.json";

interface ProfitabilityRow {
  Code: string;
  Title: string;
  TotalFee: number;
  TotalInvoiced: number;
  TimeCost: number;
  ProfitVsFee: number;
  MarginPct: number;
}

const PROJECTS: ProfitabilityRow[] = [...(profitability as ProfitabilityRow[])].sort(
  (a, b) => b.TotalFee - a.TotalFee
);

function formatGBP(n: number): string {
  return "£" + Math.round(n).toLocaleString("en-GB");
}

function formatSignedGBP(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "+";
  return sign + "£" + Math.abs(rounded).toLocaleString("en-GB");
}

function getInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  const first = words[0]?.[0]?.toUpperCase() ?? "";
  const second = words[1]?.[0]?.toUpperCase() ?? "";
  return first + second;
}

function healthColor(pct: number): string {
  if (pct >= 50) return "bg-[#16A34A]";
  if (pct >= 20) return "bg-[#F59E0B]";
  if (pct >= 0) return "bg-[#DC2626]";
  return "bg-[#7F1D1D]";
}

function healthLabel(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function ProfitabilityCard({ row }: { row: ProfitabilityRow }) {
  return (
    <div className="flex items-center gap-4">
      {/* Initials circle */}
      <div className="w-20 h-20 flex-shrink-0 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center">
        <span className="font-semibold text-lg text-gray-500" style={{ fontFamily: "Poppins, sans-serif" }}>
          {getInitials(row.Title)}
        </span>
      </div>

      {/* Outer pill */}
      <div className="flex-1 border-2 border-[#DA2C26] bg-[#FDF2F2] px-4 py-3 rounded-full">
        {/* Inner pills row */}
        <div className="flex gap-3 items-center">
          {/* Project info */}
          <div className="flex-1 min-w-0 rounded-full bg-white/60 px-5 py-2">
            <p className="font-semibold text-sm text-gray-900 truncate" style={{ fontFamily: "Poppins, sans-serif" }}>
              Project {row.Code} · {row.Title}
            </p>
            <p className="text-xs text-gray-600 truncate" style={{ fontFamily: "Roboto, sans-serif" }}>
              Fee {formatGBP(row.TotalFee)}
            </p>
          </div>

          {/* Invoiced / cost */}
          <div className="flex-shrink-0 rounded-full bg-white/60 px-5 py-2 text-center">
            <p className="font-semibold text-sm text-gray-900 whitespace-nowrap" style={{ fontFamily: "Poppins, sans-serif" }}>
              Invoiced {formatGBP(row.TotalInvoiced)}
            </p>
            <p className="text-xs text-gray-600 whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
              Cost to date {formatGBP(row.TimeCost)}
            </p>
          </div>

          {/* Profit health */}
          <div className={`flex-shrink-0 min-w-[140px] rounded-full px-5 py-2.5 text-center ${healthColor(row.MarginPct)}`}>
            <p className="font-medium text-xs text-white/90" style={{ fontFamily: "Poppins, sans-serif" }}>
              Profit health
            </p>
            <p className="font-bold text-base text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
              {healthLabel(row.MarginPct)}
            </p>
            <p className="font-medium text-[11px] text-white/85" style={{ fontFamily: "Poppins, sans-serif" }}>
              {formatSignedGBP(row.ProfitVsFee)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Projects" />

      <div className="flex-1 p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
            Live Projects
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Roboto, sans-serif" }}>
            Click any project to see the full breakdown
          </p>
          <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: "Roboto, sans-serif" }}>
            Showing {PROJECTS.length} live projects · CMap DRS snapshot
          </p>
        </div>

        <div className="space-y-4">
          {PROJECTS.map(row => (
            <ProfitabilityCard key={row.Code} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}
