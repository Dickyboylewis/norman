"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/dashboard/topbar";
import { ProjectImagePicker } from "@/components/dashboard/widgets/project-image-picker";
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

function threeSigFigs(v: number): string {
  const digits = Math.max(0, 3 - Math.floor(Math.log10(v)) - 1);
  return v.toFixed(digits);
}

function formatGBPShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return "£" + threeSigFigs(abs / 1_000_000) + "m";
  if (abs >= 1_000) return "£" + threeSigFigs(abs / 1_000) + "k";
  return "£" + Math.round(abs).toLocaleString("en-GB");
}

function formatSignedGBPShort(n: number): string {
  return (n < 0 ? "-" : "+") + formatGBPShort(n);
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

function ProfitabilityCard({ row, imageUrl }: { row: ProfitabilityRow; imageUrl: string | null }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 md:gap-4 max-w-full">
        {/* Image / initials circle */}
        <button
          className="w-10 h-10 md:w-20 md:h-20 flex-shrink-0 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#DA2C26]"
          onClick={() => setPickerOpen(true)}
          aria-label={`Update image for ${row.Title}`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={row.Title} className="h-full w-full object-cover" />
          ) : (
            <span className="font-semibold text-xs md:text-lg text-gray-500" style={{ fontFamily: "Poppins, sans-serif" }}>
              {getInitials(row.Title)}
            </span>
          )}
        </button>

        {/* Outer pill */}
        <div className="flex-1 min-w-0 border-2 border-[#DA2C26] bg-[#FDF2F2] px-2.5 py-2 md:px-4 md:py-3 rounded-full">
          {/* Inner pills row */}
          <div className="flex gap-2 md:gap-3 items-center">
            {/* Project info */}
            <div className="flex-1 min-w-0 rounded-full bg-white/60 px-3 py-1.5 md:px-5 md:py-2">
              <p className="font-semibold text-sm text-gray-900 truncate" style={{ fontFamily: "Poppins, sans-serif" }}>
                <span className="hidden md:inline">Project {row.Code} · </span>
                {row.Title}
              </p>
              <p className="text-xs text-gray-600 truncate" style={{ fontFamily: "Roboto, sans-serif" }}>
                Fee{" "}
                <span className="md:hidden">{formatGBPShort(row.TotalFee)}</span>
                <span className="hidden md:inline">{formatGBP(row.TotalFee)}</span>
              </p>
            </div>

            {/* Invoiced / cost */}
            <div className="hidden md:block flex-shrink-0 rounded-full bg-white/60 px-5 py-2 text-center">
              <p className="font-semibold text-sm text-gray-900 whitespace-nowrap" style={{ fontFamily: "Poppins, sans-serif" }}>
                Invoiced {formatGBP(row.TotalInvoiced)}
              </p>
              <p className="text-xs text-gray-600 whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
                Cost to date {formatGBP(row.TimeCost)}
              </p>
            </div>

            {/* Profit health */}
            <div className={`flex-shrink-0 rounded-full px-3 py-1.5 md:min-w-[140px] md:px-5 md:py-2.5 text-center ${healthColor(row.MarginPct)}`}>
              <p className="hidden md:block font-medium text-xs text-white/90" style={{ fontFamily: "Poppins, sans-serif" }}>
                Profit health
              </p>
              <p className="font-bold text-sm md:text-base text-white whitespace-nowrap" style={{ fontFamily: "Poppins, sans-serif" }}>
                {healthLabel(row.MarginPct)}
              </p>
              <p className="font-medium text-[11px] text-white/85 whitespace-nowrap" style={{ fontFamily: "Poppins, sans-serif" }}>
                <span className="md:hidden">{formatSignedGBPShort(row.ProfitVsFee)}</span>
                <span className="hidden md:inline">{formatSignedGBP(row.ProfitVsFee)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <ProjectImagePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        code={row.Code}
        title={row.Title}
        currentUrl={imageUrl}
      />
    </>
  );
}

export default function ProjectsPage() {
  const { data: images } = useQuery<Record<string, string>>({
    queryKey: ["project-images"],
    queryFn: async () => {
      const res = await fetch("/api/project-images");
      if (!res.ok) throw new Error("Failed to load project images");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Projects" />

      <div className="flex-1 p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="mb-6 md:mb-8">
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

        <div className="space-y-3 md:space-y-4">
          {PROJECTS.map(row => (
            <ProfitabilityCard key={row.Code} row={row} imageUrl={images?.[row.Code] ?? null} />
          ))}
        </div>
      </div>
    </div>
  );
}
