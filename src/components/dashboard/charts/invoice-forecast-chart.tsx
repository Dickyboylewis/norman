"use client";

/**
 * Invoice Forecast Chart
 *
 * Stacked bar chart of forecast invoicing per month from CMap budget tasks.
 * Each bar stacks one segment per project/probability combination: a project's
 * shared colour (project-colors.ts) at full strength for 100%-probability fees
 * and a lighter tint of the same hue for 75%-probability fees, so confirmed
 * work sits at the base of the bar in the stronger colour.
 * A dashed reference line marks the £3.5m-turnover monthly target.
 * Fetches /api/cmap/invoice-forecast via TanStack Query, with the captured
 * fixture as initialData for instant rendering.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveIndicator } from "./live-indicator";
import { projectColor } from "@/lib/project-colors";
import fixture from "@/lib/fixtures/invoice-forecast.json";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface ForecastRow {
  projectCode: string;
  projectTitle: string;
  probability: number;
  month: string;
  fee: number;
}

interface ForecastResponse {
  rows: ForecastRow[];
  source: "live" | "fixture";
}

/** £3.5m annual turnover target spread across 12 months. */
const MONTHLY_TARGET = 291_667;

/** Mix a hex colour towards white — 75%-probability segments use the 0.4 tint. */
const P75_TINT = 0.4;

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(v);

function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
    .map((c) => mix(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

function segmentKey(code: string, probability: number): string {
  return `${code}|${probability}`;
}

async function fetchForecast(): Promise<ForecastResponse> {
  const res = await fetch("/api/cmap/invoice-forecast");
  if (!res.ok) throw new Error("Failed to fetch invoice forecast");
  const body: { data: ForecastRow[] } = await res.json();
  return {
    rows: body.data,
    source: res.headers.get("X-Data-Source") === "live" ? "live" : "fixture",
  };
}

interface Segment {
  key: string;
  code: string;
  title: string;
  probability: number;
  color: string;
}

function SegmentTooltip({
  active,
  payload,
  segmentsByKey,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | string }[];
  segmentsByKey: Map<string, Segment>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const seg = segmentsByKey.get(String(item.dataKey));
  if (!seg) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: seg.color }} />
        <span className="text-xs font-semibold text-gray-900">{seg.title}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">
        {seg.probability}% probability · {fmt(Number(item.value ?? 0))}
      </p>
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-400 hover:text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

export function InvoiceForecastChart() {
  const [showP100, setShowP100] = useState(true);
  const [showP75, setShowP75] = useState(true);
  const [monthCount, setMonthCount] = useState<6 | 12>(6);

  const { data, isError } = useQuery({
    queryKey: ["invoice-forecast"],
    queryFn: fetchForecast,
    refetchInterval: 300_000, // 5 minutes
    retry: 1,
    initialData: { rows: fixture as ForecastRow[], source: "fixture" as const },
    initialDataUpdatedAt: 0,
  });

  const connected = !isError && data.source === "live";

  const { chartData, segments, legend } = useMemo(() => {
    // The visible month window, from the current month forward.
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 0; i < monthCount; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `${d.toLocaleDateString("en-GB", { month: "short" })} ${String(d.getFullYear()).slice(2)}`,
      });
    }
    const monthIndex = new Map(months.map((m, i) => [m.key, i]));

    const visible = data.rows.filter(
      (r) =>
        monthIndex.has(r.month) &&
        ((r.probability === 100 && showP100) || (r.probability === 75 && showP75)),
    );

    // One segment per project/probability combination present in the window.
    const segmentMap = new Map<string, Segment>();
    for (const r of visible) {
      const key = segmentKey(r.projectCode, r.probability);
      if (!segmentMap.has(key)) {
        const base = projectColor(r.projectCode);
        segmentMap.set(key, {
          key,
          code: r.projectCode,
          title: r.projectTitle,
          probability: r.probability,
          color: r.probability === 100 ? base : tint(base, P75_TINT),
        });
      }
    }
    // Confirmed (100%) work stacks at the base of each bar, then 75%.
    const segments = [...segmentMap.values()].sort(
      (a, b) => b.probability - a.probability || a.code.localeCompare(b.code),
    );

    const chartData: Record<string, string | number>[] = months.map((m) => ({
      month: m.key,
      label: m.label,
    }));
    for (const r of visible) {
      const row = chartData[monthIndex.get(r.month)!];
      const key = segmentKey(r.projectCode, r.probability);
      row[key] = (Number(row[key]) || 0) + r.fee;
    }

    // Legend: one swatch per project in view, labelled by title. Titles shared
    // by more than one code (e.g. LIF and LIF/1) get the code appended.
    const byCode = new Map<string, { code: string; title: string; color: string }>();
    for (const r of visible) {
      if (!byCode.has(r.projectCode)) {
        byCode.set(r.projectCode, {
          code: r.projectCode,
          title: r.projectTitle,
          color: projectColor(r.projectCode),
        });
      }
    }
    const titleCounts = new Map<string, number>();
    for (const p of byCode.values()) {
      titleCounts.set(p.title, (titleCounts.get(p.title) ?? 0) + 1);
    }
    const legend = [...byCode.values()]
      .map((p) => ({
        ...p,
        label: (titleCounts.get(p.title) ?? 0) > 1 ? `${p.title} (${p.code})` : p.title,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { chartData, segments, legend };
  }, [data.rows, showP100, showP75, monthCount]);

  const segmentsByKey = useMemo(
    () => new Map(segments.map((s) => [s.key, s])),
    [segments],
  );

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 font-[Poppins]">
              Invoice Forecast
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Scheduled invoicing by month and stage probability · Source: CMap invoicing schedule
            </p>
          </div>
          <LiveIndicator connected={connected} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TogglePill active={showP100} onClick={() => setShowP100((v) => !v)}>
            100% probability
          </TogglePill>
          <TogglePill active={showP75} onClick={() => setShowP75((v) => !v)}>
            75% probability
          </TogglePill>
          <span className="mx-1 h-4 w-px bg-gray-200" aria-hidden />
          <TogglePill active={monthCount === 6} onClick={() => setMonthCount(6)}>
            6 months
          </TogglePill>
          <TogglePill active={monthCount === 12} onClick={() => setMonthCount(12)}>
            12 months
          </TogglePill>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => `£${(Number(v) / 1000).toFixed(0)}k`}
                width={55}
              />
              <Tooltip
                shared={false}
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                content={<SegmentTooltip segmentsByKey={segmentsByKey} />}
              />
              <ReferenceLine
                y={MONTHLY_TARGET}
                stroke="#374151"
                strokeDasharray="6 4"
                strokeOpacity={0.7}
                label={{
                  value: `Monthly target: ${fmt(MONTHLY_TARGET)}`,
                  position: "insideTopRight",
                  fill: "#374151",
                  fontSize: 10,
                }}
              />
              {segments.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="fees"
                  fill={s.color}
                  stroke="#ffffff"
                  strokeWidth={1}
                  maxBarSize={48}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {legend.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {legend.map((p) => (
              <span key={p.code} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: p.color }}
                />
                <span className="text-xs text-gray-600">{p.label}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-center text-sm text-gray-400">
            No forecast fees match the current filters
          </p>
        )}
      </CardContent>
    </Card>
  );
}
