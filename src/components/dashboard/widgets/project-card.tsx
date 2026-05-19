"use client";

import { useState, useEffect } from "react";
import type { ProjectData } from "@/app/api/projects/route";
import { ProjectImagePicker } from "./project-image-picker";

const RIBA_STAGE_NAMES: Record<number, string> = {
  0: "Strategic Definition",
  1: "Preparation and Briefing",
  2: "Concept Design",
  3: "Spatial Coordination",
  4: "Technical Design",
  5: "Manufacturing and Construction",
  6: "Handover",
  7: "Use",
};

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function formatGBP(n: number): string {
  return "£" + Math.abs(Math.round(n)).toLocaleString("en-GB");
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0]?.toUpperCase() ?? "";
  const second = words[1]?.[0]?.toUpperCase() ?? "";
  return first + second;
}

function healthColor(pct: number): string {
  if (pct >= 10) return "bg-[#16A34A]";
  if (pct >= -10) return "bg-[#F59E0B]";
  return "bg-[#DC2626]";
}

function healthLabel(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function ProjectCard({ project }: { project: ProjectData }) {
  const [expanded, setExpanded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`project-image-${project.id}`);
    if (stored) setImageUrl(stored);
  }, [project.id]);

  const handleSaveImage = (url: string) => {
    localStorage.setItem(`project-image-${project.id}`, url);
    setImageUrl(url);
  };

  const toggle = () => setExpanded(prev => !prev);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const bookedPct = Math.min(100, (project.bookedSoFar / project.fee) * 100);
  const futurePct = Math.min(100 - bookedPct, (project.futureSchedule / project.fee) * 100);

  return (
    <>
      <div className="flex items-center gap-4">
        {/* Image circle */}
        <button
          className="w-20 h-20 flex-shrink-0 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#DA2C26]"
          onClick={e => { e.stopPropagation(); setPickerOpen(true); }}
          aria-label={`Update image for ${project.projectName}`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={project.projectName} className="h-full w-full object-cover" />
          ) : (
            <span className="font-semibold text-lg text-gray-500" style={{ fontFamily: "Poppins, sans-serif" }}>
              {getInitials(project.projectName)}
            </span>
          )}
        </button>

        {/* Outer pill */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          className={`flex-1 border-2 border-[#DA2C26] bg-[#FDF2F2] px-4 py-3 cursor-pointer transition-all duration-300 ${expanded ? "rounded-3xl" : "rounded-full"}`}
        >
          {/* Inner pills row */}
          <div className="flex gap-3 items-center">
            {/* Project info */}
            <div className="flex-1 min-w-0 rounded-full bg-white/60 px-5 py-2">
              <p className="font-semibold text-sm text-gray-900 truncate" style={{ fontFamily: "Poppins, sans-serif" }}>
                Project {project.projectNumber} · {project.projectName}
              </p>
              <p className="text-xs text-gray-600 truncate" style={{ fontFamily: "Roboto, sans-serif" }}>
                {project.client}
              </p>
            </div>

            {/* Stage */}
            <div className="flex-shrink-0 rounded-full bg-white/60 px-5 py-2 text-center">
              <p className="font-semibold text-sm text-gray-900 whitespace-nowrap" style={{ fontFamily: "Poppins, sans-serif" }}>
                RIBA Stage {project.ribaStage}
              </p>
              <p className="text-xs text-gray-600 whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
                {formatMonthYear(project.startDate)} — {formatMonthYear(project.endDate)}
              </p>
            </div>

            {/* Profit health */}
            <div className={`flex-shrink-0 min-w-[140px] rounded-full px-5 py-2 text-center ${healthColor(project.profitHealthPercent)}`}>
              <p className="font-medium text-xs text-white/90" style={{ fontFamily: "Poppins, sans-serif" }}>
                Profit health
              </p>
              <p className="font-bold text-base text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
                {healthLabel(project.profitHealthPercent)}
              </p>
            </div>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-5 pt-5 border-t border-[#DA2C26]/20 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1 — Details */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Details
                </h3>
                <dl className="space-y-2">
                  {[
                    ["Sector", project.sector],
                    ["Project Manager", project.projectManager],
                    ["Stage", `RIBA ${project.ribaStage} — ${RIBA_STAGE_NAMES[project.ribaStage]}`],
                    ["Duration", `${formatFullDate(project.startDate)} → ${formatFullDate(project.endDate)}`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-gray-500">{label}</dt>
                      <dd className="text-sm text-gray-900 font-medium" style={{ fontFamily: "Roboto, sans-serif" }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Column 2 — Financials */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Financials
                </h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-gray-500">Fee</dt>
                    <dd className="text-sm text-gray-900 font-medium">{formatGBP(project.fee)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Booked so far</dt>
                    <dd className="text-sm text-gray-900 font-medium">{formatGBP(project.bookedSoFar)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Future scheduled</dt>
                    <dd className="text-sm text-gray-900 font-medium">{formatGBP(project.futureSchedule)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Remaining</dt>
                    <dd className={`text-sm font-medium ${project.remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {project.remainingBudget < 0 ? "-" : ""}{formatGBP(project.remainingBudget)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Column 3 — Budget health */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                  Budget health
                </h3>
                <div className="relative h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-[#DA2C26]"
                    style={{ width: `${bookedPct}%` }}
                  />
                  <div
                    className="absolute top-0 h-full bg-[#FCA5A5]"
                    style={{ left: `${bookedPct}%`, width: `${futurePct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Booked + Scheduled</p>
                <p className="text-sm font-medium text-gray-900" style={{ fontFamily: "Roboto, sans-serif" }}>
                  {formatGBP(project.bookedSoFar + project.futureSchedule)} of {formatGBP(project.fee)}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    className="border border-gray-300 rounded-full px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={e => { e.stopPropagation(); console.log("Open in CMap:", project.projectNumber); }}
                  >
                    Open in CMap
                  </button>
                  <button
                    className="border border-gray-300 rounded-full px-3 py-1 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={e => { e.stopPropagation(); console.log("View Notes:", project.projectNumber); }}
                  >
                    View Notes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ProjectImagePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSave={handleSaveImage}
        currentUrl={imageUrl}
      />
    </>
  );
}
