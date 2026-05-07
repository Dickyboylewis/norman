"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface WeekRecord {
  weekCommencing: string;
  scores: Record<string, number>;
}

const DIRECTORS = [
  { key: "Joe Haire", label: "Joe", color: "#DC2626" },
  { key: "Jesus Jimenez", label: "Jesus", color: "#2563EB" },
  { key: "Dicky Lewis", label: "Dicky", color: "#EAB308" },
];

// Generate all 52 Monday dates for 2026
function getAll2026Weeks(): string[] {
  const weeks: string[] = [];
  // First Monday of 2026 is January 5th
  const start = new Date("2026-01-05");
  for (let i = 0; i < 52; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    weeks.push(d.toISOString().split("T")[0]);
  }
  return weeks;
}

function getQuarter(weekIndex: number): number {
  if (weekIndex < 13) return 1;
  if (weekIndex < 26) return 2;
  if (weekIndex < 39) return 3;
  return 4;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.toLocaleString("en-GB", { month: "short" });
  const day = d.getDate();
  return `${day} ${month}`;
}

function getCurrentWeekCommencing(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

const QUARTER_COLORS = [
  "rgba(220, 38, 38, 0.04)",
  "rgba(220, 38, 38, 0.08)",
  "rgba(220, 38, 38, 0.04)",
  "rgba(220, 38, 38, 0.08)",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-700 mb-2">w/c {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }} className="font-medium">
          {p.name}: {p.value ?? 0}
        </p>
      ))}
    </div>
  );
};

export function ProspectingHistoryChart() {
  const [history, setHistory] = useState<WeekRecord[]>([]);

  useEffect(() => {
    fetch("/api/prospecting-history")
      .then((r) => r.json())
      .then(setHistory)
      .catch(console.error);
  }, []);

  const allWeeks = getAll2026Weeks();
  const currentWeek = getCurrentWeekCommencing();

  // Build chart data — one entry per week
  const chartData = allWeeks.map((week, i) => {
    const record = history.find((h) => h.weekCommencing === week);
    const entry: any = {
      week,
      label: formatWeekLabel(week),
      quarter: getQuarter(i),
      isCurrent: week === currentWeek,
    };
    DIRECTORS.forEach((d) => {
      entry[d.key] = record?.scores?.[d.key] ?? null;
    });
    return entry;
  });

  // Find winner per week (for gold medal label)
  const getWinner = (entry: any): string | null => {
    let winner = null;
    let max = 0;
    DIRECTORS.forEach((d) => {
      if ((entry[d.key] ?? 0) > max) {
        max = entry[d.key];
        winner = d.key;
      }
    });
    return max > 0 ? winner : null;
  };

  const MedalLabel = (props: any) => {
    const { x, y, width, value, directorKey, entry } = props;
    if (!value || value === 0) return null;
    const winner = getWinner(entry);
    if (winner !== directorKey) return null;
    return (
      <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={12}>
        🥇
      </text>
    );
  };

  // Quarter reference areas
  const quarterAreas = [
    { x1: allWeeks[0], x2: allWeeks[12], q: 1 },
    { x1: allWeeks[13], x2: allWeeks[25], q: 2 },
    { x1: allWeeks[26], x2: allWeeks[38], q: 3 },
    { x1: allWeeks[39], x2: allWeeks[51], q: 4 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 w-full">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-800" style={{ fontFamily: "Poppins, sans-serif" }}>
          2026 Season Leaderboard
        </h2>
        <span className="text-xs text-gray-400 font-medium">Weekly prospecting scores</span>
      </div>
      <div className="flex gap-4 mb-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm opacity-30 bg-red-500"></span>Q1</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm opacity-50 bg-red-500"></span>Q2</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm opacity-30 bg-red-500"></span>Q3</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm opacity-50 bg-red-500"></span>Q4</span>
      </div>

      <div style={{ overflowX: "auto", width: "100%" }}>
        <div style={{ minWidth: "2200px" }}>
          <BarChart
            width={2200}
            height={320}
            data={chartData}
            margin={{ top: 24, right: 24, left: 0, bottom: 8 }}
            barCategoryGap="30%"
            barGap={1}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

            {quarterAreas.map((qa) => (
              <ReferenceArea
                key={qa.q}
                x1={qa.x1}
                x2={qa.x2}
                fill={QUARTER_COLORS[qa.q - 1]}
                label={{ value: `Q${qa.q}`, position: "insideTopLeft", fontSize: 11, fill: "#ccc" }}
              />
            ))}

            <XAxis
              dataKey="week"
              tickFormatter={formatWeekLabel}
              tick={{ fontSize: 9, fill: "#9ca3af" }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={48}
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={28} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => DIRECTORS.find((d) => d.key === value)?.label ?? value}
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />

            {DIRECTORS.map((director) => (
              <Bar
                key={director.key}
                dataKey={director.key}
                name={director.key}
                fill={director.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={director.color}
                    opacity={entry.isCurrent ? 1 : entry[director.key] ? 0.85 : 0.15}
                    stroke={entry.isCurrent ? director.color : "none"}
                    strokeWidth={entry.isCurrent ? 1.5 : 0}
                  />
                ))}
                <LabelList
                  content={(props: any) => (
                    <MedalLabel {...props} directorKey={director.key} entry={chartData[props.index]} />
                  )}
                />
              </Bar>
            ))}
          </BarChart>
        </div>
      </div>
    </div>
  );
}
