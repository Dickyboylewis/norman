"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getPersonColor } from "@/lib/project-colors";
import { buildDemandCapacityData, type DemandCapacityDatum } from "@/lib/resourcing-math";
import { shortDate } from "./resourcing-tooltip";
import type { ResourcingData } from "@/lib/resourcing-types";

const BRAND_RED = "#DC2626";
const CAPACITY_BLUE = "#2563EB";
const WON_OPACITY = 0.85;
const POT_OPACITY = 0.3;
const DIMMED_OPACITY = 0.25;
const DIMMED_POT_OPACITY = 0.08;

function formatFte(v: number): string {
  return String(Math.round(v * 100) / 100);
}

export function DemandCapacityChart({
  data,
  onSelectPerson,
}: {
  data: ResourcingData;
  onSelectPerson: (userId: string) => void;
}) {
  const [includePotential, setIncludePotential] = useState(true);
  const [showThreads, setShowThreads] = useState(true);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<string | null>(null);

  const chartData = useMemo(() => buildDemandCapacityData(data), [data]);
  const nameById = useMemo(
    () => new Map(data.people.map(p => [p.userId, p.name])),
    [data.people],
  );

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

  const wonOpacity = (userId: string) =>
    highlight === null ? WON_OPACITY : highlight === userId ? 1 : DIMMED_OPACITY;
  const potOpacity = (userId: string) =>
    highlight === null ? POT_OPACITY : highlight === userId ? 0.5 : DIMMED_POT_OPACITY;

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: unknown }>;
  }) => {
    if (!active || !payload?.length) return null;
    const datum = payload[0]?.payload as DemandCapacityDatum | undefined;
    if (!datum) return null;

    const rows = data.people
      .map(p => ({
        name: p.name,
        won: Number(datum[`won_${p.userId}`] ?? 0),
        pot: Number(datum[`pot_${p.userId}`] ?? 0),
      }))
      .filter(r => r.won > 0 || (includePotential && r.pot > 0))
      .sort((a, b) => b.won + b.pot - (a.won + a.pot));

    const totalDemand = datum.wonDemand + (includePotential ? datum.potentialDemand : 0);
    const headroom = datum.capacity - totalDemand;

    return (
      <div className="rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-slate-200">
        <p className="text-[11px] font-semibold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
          Week of {shortDate(datum.weekStart)}
        </p>
        {rows.map(r => (
          <p key={r.name} className="text-[11px] text-gray-700 whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
            {r.name} — {formatFte(r.won)}
            {includePotential && r.pot > 0 ? ` (+${formatFte(r.pot)} potential)` : ""}
          </p>
        ))}
        <p className="mt-1 text-[11px] font-bold text-gray-900" style={{ fontFamily: "Roboto, sans-serif" }}>
          Total demand: {formatFte(totalDemand)}
        </p>
        <p className="text-[11px] font-bold text-gray-900" style={{ fontFamily: "Roboto, sans-serif" }}>
          Capacity: {formatFte(datum.capacity)}
        </p>
        <p
          className={`text-[11px] font-bold ${headroom >= 0 ? "text-green-600" : "text-red-600"}`}
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          Headroom: {formatFte(headroom)}
        </p>
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
              Demand vs Capacity
            </CardTitle>
            <p className="mt-0.5 text-xs text-gray-500" style={{ fontFamily: "Roboto, sans-serif" }}>
              Team FTE demand against available capacity, next {data.weekStarts.length} weeks
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <label className="flex items-center gap-2 text-xs text-gray-700" style={{ fontFamily: "Roboto, sans-serif" }}>
              <Switch checked={includePotential} onCheckedChange={setIncludePotential} />
              Include potential projects
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700" style={{ fontFamily: "Roboto, sans-serif" }}>
              <Switch checked={showThreads} onCheckedChange={setShowThreads} />
              Show individual threads
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative pt-2">
        {highlight !== null && (
          <div
            className="absolute right-6 top-0 z-10 rounded-full bg-white px-3 py-1 text-[11px] font-semibold shadow ring-1 ring-slate-200"
            style={{ fontFamily: "Poppins, sans-serif", color: getPersonColor(highlight) }}
          >
            {nameById.get(highlight)}
          </div>
        )}
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
            <XAxis
              dataKey="weekStart"
              tickFormatter={shortDate}
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94A3B8" }}
              tickLine={false}
              axisLine={false}
              label={{
                value: "FTE",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: "#94A3B8" },
              }}
            />
            <Tooltip content={renderTooltip} />
            {showThreads
              ? data.people.map(p => (
                  <Area
                    key={`won_${p.userId}`}
                    type="monotone"
                    dataKey={`won_${p.userId}`}
                    stackId="demand"
                    fill={getPersonColor(p.userId)}
                    fillOpacity={wonOpacity(p.userId)}
                    stroke="none"
                    isAnimationActive={false}
                    activeDot={false}
                    onMouseEnter={() => setHighlight(p.userId)}
                    onMouseLeave={() => setHighlight(null)}
                    onClick={() => onSelectPerson(p.userId)}
                  />
                ))
              : [
                  <Area
                    key="wonDemand"
                    type="monotone"
                    dataKey="wonDemand"
                    stackId="demand"
                    fill={BRAND_RED}
                    fillOpacity={0.6}
                    stroke="none"
                    isAnimationActive={false}
                    activeDot={false}
                  />,
                ]}
            {includePotential &&
              (showThreads
                ? data.people.map(p => (
                    <Area
                      key={`pot_${p.userId}`}
                      type="monotone"
                      dataKey={`pot_${p.userId}`}
                      stackId="demand"
                      fill={getPersonColor(p.userId)}
                      fillOpacity={potOpacity(p.userId)}
                      stroke="none"
                      isAnimationActive={false}
                      activeDot={false}
                      onMouseEnter={() => setHighlight(p.userId)}
                      onMouseLeave={() => setHighlight(null)}
                      onClick={() => onSelectPerson(p.userId)}
                    />
                  ))
                : [
                    <Area
                      key="potentialDemand"
                      type="monotone"
                      dataKey="potentialDemand"
                      stackId="demand"
                      fill={BRAND_RED}
                      fillOpacity={0.2}
                      stroke="none"
                      isAnimationActive={false}
                      activeDot={false}
                    />,
                  ])}
            <Line
              type="monotone"
              dataKey="capacity"
              stroke={CAPACITY_BLUE}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            {currentWeek && (
              <ReferenceLine x={currentWeek} stroke={BRAND_RED} strokeOpacity={0.35} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
