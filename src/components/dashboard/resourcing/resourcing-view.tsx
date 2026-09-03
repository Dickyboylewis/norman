"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { fallbackProjectColor } from "@/lib/project-colors";
import { filterWeek, type ResourcingFilterMode } from "@/lib/resourcing-math";
import {
  CellInfoLines,
  buildCellInfo,
  offDays,
  shortDate,
  weekTotal,
  type ResourcingCellInfo,
} from "./resourcing-tooltip";
import type {
  ResourcingData,
  ResourcingPerson,
  ResourcingWeek,
} from "@/lib/resourcing-types";

const BRAND_RED = "#DC2626";

const NEAR_CAPACITY_MIN = 85;
const OVERBOOKED_ABOVE = 110;
const SINGLE_VIEW_MAX_PCT = 120;
const TIMEOFF_STRIPES =
  "repeating-linear-gradient(45deg, #94A3B8 0, #94A3B8 3px, #E2E8F0 3px, #E2E8F0 6px)";

function cellInfo(person: ResourcingPerson, week: ResourcingWeek): ResourcingCellInfo {
  return buildCellInfo(person.name, week);
}

function ringClass(total: number): string {
  if (total > OVERBOOKED_ABOVE) return "ring-2 ring-red-500";
  if (total >= NEAR_CAPACITY_MIN) return "ring-2 ring-amber-400";
  return "";
}

interface HoverHandlers {
  onShow: (info: ResourcingCellInfo, x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onHide: () => void;
  onPin: (info: ResourcingCellInfo) => void;
}

function WeekCell({
  person,
  week: rawWeek,
  hover,
  mode,
}: {
  person: ResourcingPerson;
  week: ResourcingWeek;
  hover: HoverHandlers;
  mode: ResourcingFilterMode;
}) {
  const week = filterWeek(rawWeek, mode);
  const total = weekTotal(week);
  const off = offDays(week);
  const info = () => cellInfo(person, week);
  const scale = Math.max(100, total);

  return (
    <div
      className={`relative h-6 flex-1 overflow-hidden rounded-sm ${
        total === 0 && off === 0
          ? "border border-dashed border-slate-300 bg-transparent"
          : "border border-slate-200 bg-white"
      } ${ringClass(total)}`}
      onMouseEnter={e => hover.onShow(info(), e.clientX, e.clientY)}
      onMouseMove={e => hover.onMove(e.clientX, e.clientY)}
      onMouseLeave={hover.onHide}
      onClick={() => hover.onPin(info())}
    >
      <div className="flex h-full w-full">
        {week.projects.map(p => (
          <div
            key={`${p.projectCode}-${p.projectTitle}`}
            className="h-full"
            style={{
              width: `${(p.percentage / scale) * 100}%`,
              backgroundColor: p.color ?? fallbackProjectColor(p.projectCode),
              opacity: p.won ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      {off > 0 && (
        <div
          aria-label={`Time off: ${off} ${off === 1 ? "day" : "days"}`}
          className="absolute left-0 top-0 flex h-[38%] items-center justify-center overflow-hidden"
          style={{ width: `${Math.min(100, (off / 5) * 100)}%`, background: TIMEOFF_STRIPES }}
        >
          {off / 5 >= 0.4 && (
            <span className="text-[6px] font-semibold uppercase leading-none text-slate-600">off</span>
          )}
        </div>
      )}
    </div>
  );
}

function EveryoneView({
  data,
  currentWeek,
  hover,
  mode,
}: {
  data: ResourcingData;
  currentWeek: string | null;
  hover: HoverHandlers;
  mode: ResourcingFilterMode;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[880px]">
        <div className="flex items-end gap-1 pb-2">
          <div className="w-40 flex-shrink-0 md:w-48" />
          {data.weekStarts.map(ws => (
            <div key={ws} className="flex-1 text-center">
              <span
                className={`inline-block text-[9px] whitespace-nowrap ${
                  ws === currentWeek
                    ? "border-b-2 border-red-600 font-semibold text-red-600"
                    : "text-gray-400"
                }`}
                style={{ fontFamily: "Roboto, sans-serif" }}
              >
                {shortDate(ws)}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {data.people.map(person => (
            <div key={person.userId} className="flex items-center gap-1">
              <div className="w-40 flex-shrink-0 md:w-48">
                <p className="truncate text-xs font-semibold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {person.name}
                </p>
                <p className="truncate text-[10px] text-gray-500" style={{ fontFamily: "Roboto, sans-serif" }}>
                  {person.jobTitle ?? "—"}
                </p>
              </div>
              {person.weeks.map(week => (
                <WeekCell key={week.weekStart} person={person} week={week} hover={hover} mode={mode} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SinglePersonView({
  person,
  weekStarts,
  currentWeek,
  hover,
  mode,
}: {
  person: ResourcingPerson;
  weekStarts: string[];
  currentWeek: string | null;
  hover: HoverHandlers;
  mode: ResourcingFilterMode;
}) {
  const weekByStart = useMemo(
    () => new Map(person.weeks.map(w => [w.weekStart, filterWeek(w, mode)])),
    [person, mode],
  );

  const legend = useMemo(() => {
    const seen = new Map<string, { title: string; color: string }>();
    for (const week of person.weeks.map(w => filterWeek(w, mode))) {
      for (const p of week.projects) {
        if (!seen.has(p.projectCode)) {
          seen.set(p.projectCode, {
            title: p.projectTitle,
            color: p.color ?? fallbackProjectColor(p.projectCode),
          });
        }
      }
    }
    return [...seen.entries()];
  }, [person, mode]);

  return (
    <div>
      <div className="relative h-64">
        <div
          className="absolute left-0 right-0 border-t border-dashed border-slate-400"
          style={{ bottom: `${(100 / SINGLE_VIEW_MAX_PCT) * 100}%` }}
        >
          <span className="absolute -top-2 right-0 bg-white pl-1 text-[9px] text-slate-400" style={{ fontFamily: "Roboto, sans-serif" }}>
            100%
          </span>
        </div>
        <div className="flex h-full items-end gap-1.5 md:gap-2">
          {weekStarts.map(ws => {
            const week = weekByStart.get(ws);
            if (!week) return <div key={ws} className="flex-1" />;
            const total = weekTotal(week);
            const off = offDays(week);
            const offPct = (off / 5) * 100;
            const info = () => cellInfo(person, week);
            return (
              <div
                key={ws}
                className="flex h-full flex-1 flex-col justify-end overflow-hidden"
                onMouseEnter={e => hover.onShow(info(), e.clientX, e.clientY)}
                onMouseMove={e => hover.onMove(e.clientX, e.clientY)}
                onMouseLeave={hover.onHide}
                onClick={() => hover.onPin(info())}
              >
                {off > 0 && (
                  <div
                    className="w-full flex-shrink-0"
                    style={{
                      height: `${(offPct / SINGLE_VIEW_MAX_PCT) * 100}%`,
                      background: TIMEOFF_STRIPES,
                    }}
                  />
                )}
                {[...week.projects].reverse().map(p => (
                  <div
                    key={`${p.projectCode}-${p.projectTitle}`}
                    className="w-full flex-shrink-0"
                    style={{
                      height: `${(p.percentage / SINGLE_VIEW_MAX_PCT) * 100}%`,
                      backgroundColor: p.color ?? fallbackProjectColor(p.projectCode),
                      opacity: p.won ? 1 : 0.4,
                    }}
                  />
                ))}
                {total === 0 && off === 0 && (
                  <div className="h-1 w-full rounded-sm border border-dashed border-slate-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-1.5 md:gap-2">
        {weekStarts.map(ws => (
          <div key={ws} className="flex-1 text-center">
            <span
              className={`inline-block text-[9px] whitespace-nowrap ${
                ws === currentWeek
                  ? "border-b-2 border-red-600 font-semibold text-red-600"
                  : "text-gray-400"
              }`}
              style={{ fontFamily: "Roboto, sans-serif" }}
            >
              {shortDate(ws)}
            </span>
          </div>
        ))}
      </div>
      {legend.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {legend.map(([code, entry]) => (
            <span key={code} className="flex items-center gap-1.5 text-[11px] text-gray-700" style={{ fontFamily: "Roboto, sans-serif" }}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
              {code} {entry.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourcingView({
  data,
  selectedId,
  onSelect,
  filterMode,
}: {
  data: ResourcingData;
  selectedId: string | null;
  onSelect: (userId: string | null) => void;
  filterMode: ResourcingFilterMode;
}) {
  const [tooltip, setTooltip] = useState<{ info: ResourcingCellInfo; x: number; y: number } | null>(null);
  const [pinned, setPinned] = useState<ResourcingCellInfo | null>(null);
  const [currentWeek, setCurrentWeek] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      let match: string | null = null;
      for (const ws of data.weekStarts) {
        if (ws <= today) match = ws;
      }
      if (match) {
        const end = new Date(match + "T00:00:00Z");
        end.setUTCDate(end.getUTCDate() + 7);
        if (today >= end.toISOString().slice(0, 10)) match = null;
      }
      setCurrentWeek(match);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data.weekStarts]);

  const selected = useMemo(
    () => data.people.find(p => p.userId === selectedId) ?? null,
    [data.people, selectedId],
  );

  const hover: HoverHandlers = {
    onShow: (info, x, y) => setTooltip({ info, x, y }),
    onMove: (x, y) => setTooltip(t => (t ? { ...t, x, y } : t)),
    onHide: () => setTooltip(null),
    onPin: info => setPinned(info),
  };

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setPinned(null);
          }}
          className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            selectedId === null
              ? "border-transparent text-white"
              : "border-slate-300 bg-white text-gray-700 hover:bg-slate-50"
          }`}
          style={selectedId === null ? { backgroundColor: BRAND_RED } : undefined}
        >
          Everyone
        </button>
        {data.people.map(person => (
          <button
            key={person.userId}
            type="button"
            onClick={() => {
              onSelect(person.userId);
              setPinned(null);
            }}
            className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              selectedId === person.userId
                ? "border-transparent text-white"
                : "border-slate-300 bg-white text-gray-700 hover:bg-slate-50"
            }`}
            style={selectedId === person.userId ? { backgroundColor: BRAND_RED } : undefined}
          >
            {person.name}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          {selected ? (
            <SinglePersonView
              person={selected}
              weekStarts={data.weekStarts}
              currentWeek={currentWeek}
              hover={hover}
              mode={filterMode}
            />
          ) : (
            <EveryoneView data={data} currentWeek={currentWeek} hover={hover} mode={filterMode} />
          )}
        </CardContent>
      </Card>

      {pinned && (
        <Card className="mt-3">
          <CardContent className="relative p-3">
            <button
              type="button"
              aria-label="Dismiss details"
              onClick={() => setPinned(null)}
              className="absolute right-2 top-2 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <CellInfoLines info={pinned} />
          </CardContent>
        </Card>
      )}

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-slate-200"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <CellInfoLines info={tooltip.info} />
        </div>
      )}
    </div>
  );
}
