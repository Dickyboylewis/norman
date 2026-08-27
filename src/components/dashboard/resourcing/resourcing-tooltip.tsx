"use client";

import { projectColor } from "@/lib/project-colors";
import type { ResourcingWeek } from "@/lib/resourcing-types";

export interface ResourcingCellInfo {
  personName: string;
  range: string;
  projects: { code: string; title: string; pct: number; won: boolean; probability: number }[];
  timeOff: { label: string; days: number }[];
  total: number;
}

export function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function weekRangeLabel(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00Z");
  const fri = new Date(start);
  fri.setUTCDate(fri.getUTCDate() + 4);
  if (start.getUTCMonth() === fri.getUTCMonth()) {
    return `${start.getUTCDate()}–${shortDate(fri.toISOString().slice(0, 10))}`;
  }
  return `${shortDate(weekStart)} – ${shortDate(fri.toISOString().slice(0, 10))}`;
}

export function weekTotal(week: ResourcingWeek): number {
  return week.projects.reduce((sum, p) => sum + p.percentage, 0);
}

export function offDays(week: ResourcingWeek): number {
  return week.timeOffDays.reduce((sum, t) => sum + t.days, 0);
}

export function buildCellInfo(personName: string, week: ResourcingWeek): ResourcingCellInfo {
  return {
    personName,
    range: weekRangeLabel(week.weekStart),
    projects: [...week.projects]
      .sort((a, b) => b.percentage - a.percentage)
      .map(p => ({
        code: p.projectCode,
        title: p.projectTitle,
        pct: p.percentage,
        won: p.won,
        probability: p.probability,
      })),
    timeOff: week.timeOffDays.map(t => ({ label: t.label, days: t.days })),
    total: weekTotal(week),
  };
}

export function CellInfoLines({ info }: { info: ResourcingCellInfo }) {
  return (
    <>
      <p className="text-[11px] font-semibold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
        {info.personName} · {info.range}
      </p>
      {info.projects.map(p => (
        <p key={`${p.code}-${p.title}`} className="text-[11px] text-gray-700 whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle"
            style={{ backgroundColor: projectColor(p.code) }}
          />
          {p.code} {p.title} — {p.pct}%
          {!p.won ? ` (${p.probability}%)` : ""}
        </p>
      ))}
      {info.timeOff.map(t => (
        <p key={t.label} className="text-[11px] text-gray-500" style={{ fontFamily: "Roboto, sans-serif" }}>
          {t.label} — {t.days} {t.days === 1 ? "day" : "days"}
        </p>
      ))}
      <p className="mt-0.5 text-[11px] font-bold text-gray-900" style={{ fontFamily: "Roboto, sans-serif" }}>
        Total: {info.total}%
      </p>
    </>
  );
}
