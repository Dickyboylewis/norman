"use client";

/**
 * DealRevenueChart — White Red Dashboard
 *
 * Stacked bar chart showing YTD deal revenue per director.
 * Fetches live data from /api/monday/deals (Monday.com Deals board 1461714574).
 *
 * ── Features ──────────────────────────────────────────────────────────────
 *
 * 1. YTD DATA
 *    Pulls deals won from Jan 1st of the current year to today.
 *    Shared deals are split equally between owners.
 *
 * 2. AVATARS & FIRST NAMES
 *    Circular avatar on X-axis (jesus.png, joe.png, dicky.png from /public).
 *    First name shown below on desktop, hidden on mobile.
 *
 * 3. STACKED BARS BY PROJECT NAME
 *    Each deal/project is its own stack segment. Color families per person:
 *      Jesus → Blues  (blue-400 / blue-500 / blue-600 …)
 *      Joe   → Reds   (red-400  / red-500  / red-600  …)
 *      Dicky → Ambers (amber-400 / amber-500 / amber-600 …)
 *    Shared deals → Purples (purple-400 / purple-500 …) on BOTH owners' bars.
 *
 * 4. LEADERBOARD MEDALS
 *    Gold 🥇 / Silver 🥈 / Bronze 🥉 floating above each bar based on total
 *    revenue. Ties share the same medal. £0 shows plain grey £0.
 *
 * 5. QUARTERLY TARGET LINE
 *    Dashed ReferenceLine for the CURRENT quarter only (individual targets):
 *    Q1 £250k | Q2 £500k | Q3 £750k | Q4 £1m
 *    Dynamically zooms in the chart to the relevant quarter.
 */

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Avatar map ─────────────────────────────────────────────────────────────
const PERSON_META: Record<string, { avatar: string; firstName: string }> = {
  "Joe Haire":     { avatar: "/joe.png",   firstName: "Joe"   },
  "Jesus Jimenez": { avatar: "/jesus.png", firstName: "Jesus" },
  "Dicky Lewis":   { avatar: "/dicky.png", firstName: "Dicky" },
};

// ── Color palettes per person (Tailwind hex equivalents) ───────────────────
const PERSON_COLORS: Record<string, string[]> = {
  "Jesus Jimenez": ["#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF", "#1E3A8A"],
  "Joe Haire":     ["#F87171", "#EF4444", "#DC2626", "#B91C1C", "#991B1B", "#7F1D1D"],
  "Dicky Lewis":   ["#FBBF24", "#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F"],
};

// Shared deal colors (purple shades)
const SHARED_COLORS = ["#C084FC", "#A855F7", "#9333EA", "#7C3AED", "#6D28D9", "#5B21B6"];

// ── Individual quarterly targets (£1m annual per director) ─────────────────
const QUARTERLY_TARGETS = [
  { value: 250_000,   label: "Q1 Target (£250k)" },
  { value: 500_000,   label: "Q2 Target (£500k)" },
  { value: 750_000,   label: "Q3 Target (£750k)" },
  { value: 1_000_000, label: "Q4 Target (£1m)"   },
];

function getCurrentQuarterIndex(): number {
  const month = new Date().getMonth();
  return Math.floor(month / 3);
}

// ── Medal helpers ──────────────────────────────────────────────────────────
type MedalInfo = { emoji: string; color: string };

function getMedalInfo(rank: number): MedalInfo {
  if (rank === 1) return { emoji: "🥇", color: "#EAB308" };
  if (rank === 2) return { emoji: "🥈", color: "#94A3B8" };
  if (rank === 3) return { emoji: "🥉", color: "#D97706" };
  return { emoji: "", color: "#9CA3AF" };
}

function computeRevenueRanks(totals: number[]): Record<number, number> {
  const uniqueScores = Array.from(new Set(totals.filter((s) => s > 0))).sort(
    (a, b) => b - a
  );
  const map: Record<number, number> = {};
  uniqueScores.forEach((score, idx) => {
    map[score] = idx + 1;
  });
  return map;
}

// ── Currency formatter ─────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  if (value === 0) return "£0";
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `£${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}m`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `£${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `£${value.toFixed(0)}`;
}

// ── Y-Axis tick formatter ──────────────────────────────────────────────────
function yAxisFormatter(value: number): string {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000)     return `£${(value / 1_000).toFixed(0)}k`;
  return `£${value}`;
}

// ── Custom XAxis tick with avatar + name ───────────────────────────────────
interface CustomTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  isMobile?: boolean;
  [key: string]: any;
}

function CustomXAxisTick({ x = 0, y = 0, payload, isMobile = false }: CustomTickProps) {
  const numX = typeof x === "string" ? parseFloat(x) : (x ?? 0);
  const numY = typeof y === "string" ? parseFloat(y) : (y ?? 0);
  const name = payload?.value ?? "";
  const meta = PERSON_META[name];
  if (!meta) return null;

  const AVATAR_R = isMobile ? 16 : 22;
  const avatarY  = numY + 8;

  return (
    <g transform={`translate(${numX},${avatarY})`}>
      <defs>
        <clipPath id={`deal-avatar-clip-${name.replace(/\s/g, "")}`}>
          <circle cx={0} cy={AVATAR_R} r={AVATAR_R} />
        </clipPath>
      </defs>
      <circle
        cx={0}
        cy={AVATAR_R}
        r={AVATAR_R + 1.5}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={1.5}
      />
      <image
        href={meta.avatar}
        x={-AVATAR_R}
        y={0}
        width={AVATAR_R * 2}
        height={AVATAR_R * 2}
        clipPath={`url(#deal-avatar-clip-${name.replace(/\s/g, "")})`}
        preserveAspectRatio="xMidYMid slice"
      />
      {!isMobile && (
        <text
          x={0}
          y={AVATAR_R * 2 + 16}
          textAnchor="middle"
          fill="#374151"
          fontSize={12}
          fontFamily="var(--font-poppins), Poppins, sans-serif"
          fontWeight={500}
        >
          {meta.firstName}
        </text>
      )}
    </g>
  );
}

// ── Custom revenue label above the top bar segment ─────────────────────────
interface RevenueLabelProps {
  x?: number;
  y?: number;
  width?: number;
  index?: number;
  chartData?: ChartRow[];
  revenueRanks?: Record<number, number>;
}

interface ChartRow {
  name: string;
  total: number;
  [key: string]: any;
}

function RevenueLabel({
  x = 0,
  y = 0,
  width = 0,
  index = 0,
  chartData = [],
  revenueRanks = {},
}: RevenueLabelProps) {
  const row   = chartData[index];
  const total = row?.total ?? 0;

  if (total === 0) {
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fill="#9CA3AF"
        fontSize={12}
        fontWeight={700}
        fontFamily="var(--font-roboto), Roboto, sans-serif"
      >
        £0
      </text>
    );
  }

  const rank  = revenueRanks[total] ?? 99;
  const medal = getMedalInfo(rank);

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill={medal.color}
      fontSize={13}
      fontWeight={700}
      fontFamily="var(--font-roboto), Roboto, sans-serif"
    >
      {medal.emoji}{formatCurrency(total)}
    </text>
  );
}

// ── Reference line label (pinned right with background pill) ───────────────
function TargetLineLabel({ viewBox, label }: { viewBox?: any; label: string }) {
  if (!viewBox) return null;
  const { x, y, width } = viewBox;

  const textX = (x ?? 0) + (width ?? 0);
  const textY = (y ?? 0) - 12;
  const padH  = 6;
  const padV  = 4;
  const textW = label.length * 5.8;
  const pillW = textW + padH * 2;
  const pillH = 16;

  return (
    <g>
      <rect
        x={textX - pillW - 2}
        y={textY - pillH / 2 - padV / 2}
        width={pillW}
        height={pillH}
        rx={4}
        ry={4}
        fill="#FFFBEB"
        stroke="#F59E0B"
        strokeWidth={1}
      />
      <text
        x={textX - pillW / 2 - 2}
        y={textY + 4}
        textAnchor="middle"
        fill="#B45309"
        fontSize={10}
        fontWeight={600}
        fontFamily="var(--font-poppins), Poppins, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

// ── Data types ─────────────────────────────────────────────────────────────
interface DealEntry {
  dealName: string;
  value: number;
  isShared: boolean;
  owners: string[];
}

interface PersonData {
  name: string;
  deals: DealEntry[];
  total: number;
}

// ── Build chart data from API response ────────────────────────────────────
function buildChartData(apiData: PersonData[]): {
  chartData: ChartRow[];
  barKeys: Array<{ key: string; colors: Record<string, string> }>;
} {
  const allDealNames = new Set<string>();
  apiData.forEach((person) => {
    person.deals.forEach((deal) => {
      allDealNames.add(deal.dealName);
    });
  });

  const dealMeta: Record<string, { isShared: boolean; owners: string[] }> = {};
  apiData.forEach((person) => {
    person.deals.forEach((deal) => {
      dealMeta[deal.dealName] = {
        isShared: deal.isShared,
        owners:   deal.owners,
      };
    });
  });

  const personDealCount: Record<string, number> = {};
  const barKeys: Array<{ key: string; colors: Record<string, string> }> = [];
  const dealColorIndex: Record<string, number> = {};
  const dealNames = Array.from(allDealNames);

  dealNames.forEach((dealName) => {
    const meta = dealMeta[dealName];
    const colors: Record<string, string> = {};

    apiData.forEach((person) => {
      const hasDeal = person.deals.some((d) => d.dealName === dealName);
      if (!hasDeal) return;

      if (meta.isShared) {
        if (dealColorIndex[dealName] === undefined) {
          const sharedCount = Object.values(dealColorIndex).length;
          dealColorIndex[dealName] = sharedCount % SHARED_COLORS.length;
        }
        colors[person.name] = SHARED_COLORS[dealColorIndex[dealName]];
      } else {
        if (personDealCount[person.name] === undefined) personDealCount[person.name] = 0;
        const palette = PERSON_COLORS[person.name] ?? ["#6B7280"];
        colors[person.name] = palette[personDealCount[person.name] % palette.length];
        personDealCount[person.name]++;
      }
    });

    barKeys.push({ key: dealName, colors });
  });

  const chartData: ChartRow[] = apiData.map((person) => {
    const row: ChartRow = { name: person.name, total: person.total };
    person.deals.forEach((deal) => {
      row[deal.dealName] = deal.value;
    });
    return row;
  });

  return { chartData, barKeys };
}

// ── Main component ─────────────────────────────────────────────────────────
export function DealRevenueChart() {
  const [apiData, setApiData]   = useState<PersonData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetch("/api/monday/deals")
      .then((res) => res.json())
      .then((json) => {
        setApiData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load deals data", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card className="w-full h-[500px] flex items-center justify-center">
        <div className="text-gray-400 font-poppins animate-pulse">
          Loading YTD Deal Revenue…
        </div>
      </Card>
    );
  }

  const { chartData, barKeys } = buildChartData(apiData);

  const totals       = chartData.map((r) => r.total);
  const revenueRanks = computeRevenueRanks(totals);

  const chartHeight  = isMobile ? 240 : 340;
  const bottomMargin = isMobile ? 50 : 70;

  // Current quarter target — drives the Y-axis zoom
  const qIdx          = getCurrentQuarterIndex();
  const currentTarget = QUARTERLY_TARGETS[qIdx];

  const maxTotal = Math.max(...totals, currentTarget.value);
  const yDomain: [number, number] = [0, Math.ceil(maxTotal * 1.2)];

  const hasAnyDeals = barKeys.length > 0;

  return (
    <Card className="w-full flex flex-col font-roboto shadow-sm border-gray-200">
      {/* ── Header ── */}
      <CardHeader className="pb-2">
        <div className="flex flex-col items-center">
          <CardTitle
            className="text-xl font-bold text-gray-800 text-center"
            style={{ fontFamily: "var(--font-roboto), Roboto, sans-serif" }}
          >
            YTD Deal Revenue
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Live
            </span>
          </div>
        </div>
      </CardHeader>

      {/* ── Chart ── */}
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            margin={{ top: 36, right: 24, left: 8, bottom: bottomMargin }}
            barSize={isMobile ? 60 : 96}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              height={bottomMargin}
              tick={(props) => (
                <CustomXAxisTick {...props} isMobile={isMobile} />
              )}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickFormatter={yAxisFormatter}
              domain={yDomain}
              width={55}
            />

            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              formatter={(value: any, name: any) => [formatCurrency(Number(value) || 0), String(name)]}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontFamily: "var(--font-poppins), Poppins, sans-serif",
                fontSize: 12,
              }}
            />

            {/* ── Current-quarter target reference line ONLY ── */}
            <ReferenceLine
              y={currentTarget.value}
              stroke="#F59E0B"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={(props: any) => (
                <TargetLineLabel {...props} label={currentTarget.label} />
              )}
            />

            {/* ── Stacked deal bars (each deal = one stack segment) ── */}
            {hasAnyDeals ? (
              barKeys.map((barKey, barIdx) => (
                <Bar
                  key={barKey.key}
                  dataKey={barKey.key}
                  stackId="revenue"
                  name={barKey.key}
                  radius={
                    barIdx === barKeys.length - 1
                      ? [4, 4, 0, 0]
                      : barIdx === 0
                      ? [0, 0, 4, 4]
                      : [0, 0, 0, 0]
                  }
                >
                  {chartData.map((row) => (
                    <Cell
                      key={`cell-${row.name}-${barKey.key}`}
                      fill={barKey.colors[row.name] ?? "#E5E7EB"}
                    />
                  ))}

                  {barIdx === barKeys.length - 1 && (
                    <LabelList
                      dataKey={barKey.key}
                      content={(props: any) => (
                        <RevenueLabel
                          {...props}
                          chartData={chartData}
                          revenueRanks={revenueRanks}
                        />
                      )}
                    />
                  )}
                </Bar>
              ))
            ) : (
              <Bar
                dataKey="_placeholder"
                stackId="revenue"
                fill="transparent"
                radius={[4, 4, 4, 4]}
              >
                <LabelList
                  dataKey="_placeholder"
                  content={(props: any) => (
                    <RevenueLabel
                      {...props}
                      chartData={chartData}
                      revenueRanks={revenueRanks}
                    />
                  )}
                />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>

        {/* ── Shared deal legend ── */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: SHARED_COLORS[0] }}
          />
          <span
            className="text-xs text-gray-400"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            Purple = Shared Deal (split equally)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
