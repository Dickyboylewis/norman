"use client";

/**
 * ProspectingChart — White Red Dashboard
 *
 * Stacked bar chart showing this week's lead pipeline per director.
 * Fetches live data from /api/monday (Monday.com board).
 *
 * ── Features ──────────────────────────────────────────────────────────────
 *
 * 1. AVATARS & FIRST NAMES
 *    A custom XAxis tick renders a circular avatar photo (joe.png, jesus.png,
 *    dicky.png from /public) next to each person's first name on desktop.
 *    On mobile (≤ 480 px) only the avatar is shown — no name text.
 *
 * 2. COMPACT SINGLE-LINE LEGEND
 *    A fully custom legend sits below the chart on one horizontal row.
 *    Desktop: full label text.  Mobile: abbreviated labels.
 *    Font size is kept small so everything fits without wrapping.
 *
 * 3. APPOINTMENT COUNT LABELS
 *    The number shown above each bar counts ONLY the green "Appointments"
 *    segment.  Zero is always shown (never blank) so every column has a label.
 *
 * 4. GOLD / SILVER / BRONZE MEDALS
 *    The label colour and emoji medal (🥇🥈🥉) reflect the appointment ranking.
 *    Ties share the same medal.  Ranking is recalculated on every render.
 *
 * 5. MOBILE RESPONSIVENESS
 *    The chart height shrinks on small screens.  The XAxis tick hides the name
 *    text on mobile.  The legend uses abbreviated labels on mobile.
 *
 * ── Data shape from /api/monday ───────────────────────────────────────────
 *   [{ name: "Joe Haire", "New Lead": n, "Attempted to Contact": n,
 *      "Needs Follow up": n, "Appointments": n }, ...]
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
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Avatar map ─────────────────────────────────────────────────────────────
// Maps the full name (as returned by the API) to the public image path and
// the first name shown below the bar on desktop.
const PERSON_META: Record<string, { avatar: string; firstName: string }> = {
  "Joe Haire":     { avatar: "/joe.png",   firstName: "Joe"   },
  "Jesus Jimenez": { avatar: "/jesus.png", firstName: "Jesus" },
  "Dicky Lewis":   { avatar: "/dicky.png", firstName: "Dicky" },
};

// ── Legend config ──────────────────────────────────────────────────────────
const LEGEND_ITEMS = [
  { color: "#34D399", label: "Appointments",        short: "Appts"      },
  { color: "#FBCFE8", label: "Attempted to Contact", short: "Att. Cont" },
  { color: "#F97316", label: "Needs Follow up",      short: "Needs FU"  },
  { color: "#FBBF24", label: "New Lead",             short: "New Lead"  },
];

// ── Medal helpers ──────────────────────────────────────────────────────────
type MedalInfo = { emoji: string; color: string };

function getMedalInfo(rank: number): MedalInfo {
  if (rank === 1) return { emoji: "🥇", color: "#EAB308" }; // gold   (text-yellow-500)
  if (rank === 2) return { emoji: "🥈", color: "#94A3B8" }; // silver (text-slate-400)
  if (rank === 3) return { emoji: "🥉", color: "#D97706" }; // bronze (text-amber-600)
  return { emoji: "", color: "#9CA3AF" };
}

/**
 * Compute a score → rank map based on unique appointment scores.
 *
 * Algorithm:
 *  1. Collect all appointment scores.
 *  2. Deduplicate and sort descending → unique ranked scores.
 *  3. Map each unique score to its rank position (1st, 2nd, 3rd …).
 *
 * Example: scores [4, 1, 1] → unique sorted [4, 1]
 *   → 4 = rank 1 (Gold 🥇), 1 = rank 2 (Silver 🥈)
 *   → both people with score 1 share rank 2
 *
 * Zero is excluded from ranking — the label handles the zero rule separately.
 */
function computeScoreRanks(data: any[]): Record<number, number> {
  const uniqueScores = Array.from(
    new Set(
      data
        .map((d) => d["Appointments"] ?? 0)
        .filter((s) => s > 0)
    )
  ).sort((a, b) => b - a); // descending

  const scoreRankMap: Record<number, number> = {};
  uniqueScores.forEach((score, idx) => {
    scoreRankMap[score] = idx + 1; // 1-based rank
  });

  return scoreRankMap;
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

  const AVATAR_R = isMobile ? 16 : 20; // radius of the circular avatar
  const avatarY  = numY + 8;           // vertical offset from axis line

  return (
    <g transform={`translate(${numX},${avatarY})`}>
      {/* Circular clip */}
      <defs>
        <clipPath id={`avatar-clip-${name.replace(/\s/g, "")}`}>
          <circle cx={0} cy={AVATAR_R} r={AVATAR_R} />
        </clipPath>
      </defs>

      {/* Subtle ring */}
      <circle
        cx={0}
        cy={AVATAR_R}
        r={AVATAR_R + 1.5}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={1.5}
      />

      {/* Avatar image */}
      <image
        href={meta.avatar}
        x={-AVATAR_R}
        y={0}
        width={AVATAR_R * 2}
        height={AVATAR_R * 2}
        clipPath={`url(#avatar-clip-${name.replace(/\s/g, "")})`}
        preserveAspectRatio="xMidYMid slice"
      />

      {/* First name — hidden on mobile */}
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

// ── Custom label above the top bar segment ─────────────────────────────────
interface AppointmentLabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
  scoreRanks?: Record<number, number>;
}

function AppointmentLabel({ x = 0, y = 0, width = 0, value = 0, scoreRanks = {} }: AppointmentLabelProps) {
  const count = value ?? 0;

  // Zero rule: plain 0 in neutral grey, no emoji
  if (count === 0) {
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fill="#9CA3AF"
        fontSize={13}
        fontWeight={700}
        fontFamily="var(--font-roboto), Roboto, sans-serif"
      >
        0
      </text>
    );
  }

  const rank  = scoreRanks[count] ?? 99;
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
      {medal.emoji}{count}
    </text>
  );
}

// ── Custom compact legend ──────────────────────────────────────────────────
function CompactLegend({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "nowrap",
        justifyContent: "center",
        alignItems: "center",
        gap: isMobile ? "8px" : "14px",
        paddingTop: "12px",
        paddingBottom: "4px",
      }}
    >
      {LEGEND_ITEMS.map((item) => (
        <div
          key={item.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: isMobile ? 8 : 10,
              height: isMobile ? 8 : 10,
              borderRadius: "50%",
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: isMobile ? 9 : 11,
              color: "#6B7280",
              fontFamily: "var(--font-poppins), Poppins, sans-serif",
              fontWeight: 500,
            }}
          >
            {isMobile ? item.short : item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function ProspectingChart({ disableAnimations = false }: { disableAnimations?: boolean } = {}) {
  const [data, setData]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Fetch live Monday.com data
  useEffect(() => {
    fetch("/api/monday")
      .then((res) => res.json())
      .then((json) => {
        setData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load prospecting data", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card className="w-full h-[500px] flex items-center justify-center">
        <div className="text-gray-400 font-poppins animate-pulse">
          Loading Live Monday Data…
        </div>
      </Card>
    );
  }

  // Compute score → rank map once per render so labels and medals stay in sync
  const scoreRanks = computeScoreRanks(data);

  // Chart height adapts to screen size
  const chartHeight = isMobile ? 220 : 300;

  // Extra bottom margin so the avatar + name don't get clipped
  const bottomMargin = isMobile ? 50 : 70;

  return (
    <Card className="w-full flex flex-col font-roboto shadow-sm border-gray-200">
      {/* ── Header ── */}
      <CardHeader className="pb-2">
        <div className="flex flex-col items-center">
          <CardTitle
            className="text-xl font-bold text-gray-800 text-center"
            style={{ fontFamily: "var(--font-roboto), Roboto, sans-serif" }}
          >
            This Week&apos;s Prospecting
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
            data={data}
            margin={{ top: 28, right: 16, left: 0, bottom: bottomMargin }}
            barSize={isMobile ? 40 : 60}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />

            {/*
             * XAxis — uses a custom tick that renders the circular avatar photo
             * and (on desktop) the person's first name.
             * The `height` prop gives enough room for the avatar + name below
             * the bars without being clipped.
             */}
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              height={bottomMargin}
              tick={(props) => (
                <CustomXAxisTick {...props} isMobile={isMobile} />
              )}
            />

            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />

            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontFamily: "var(--font-poppins), Poppins, sans-serif",
                fontSize: 12,
              }}
            />

            {/*
             * Stacked bars — bottom to top order matches the legend order
             * (New Lead at the bottom, Appointments at the top).
             */}
            <Bar dataKey="New Lead"              stackId="a" fill="#FBBF24" radius={[0, 0, 4, 4]} name="New Lead" isAnimationActive={!disableAnimations} />
            <Bar dataKey="Attempted to Contact"  stackId="a" fill="#FBCFE8" name="Attempted to Contact" isAnimationActive={!disableAnimations} />
            <Bar dataKey="Needs Follow up"       stackId="a" fill="#F97316" name="Needs Follow up" isAnimationActive={!disableAnimations} />

            {/*
             * Appointments bar — the green top segment.
             * LabelList renders the custom label above each bar showing ONLY
             * the appointment count (not the total stack height).
             * Zero is always rendered so no column is ever blank.
             */}
            <Bar
              dataKey="Appointments"
              stackId="a"
              fill="#34D399"
              radius={[4, 4, 0, 0]}
              name="Appointments"
              isAnimationActive={!disableAnimations}
            >
              <LabelList
                dataKey="Appointments"
                content={(props: any) => (
                  <AppointmentLabel
                    {...props}
                    scoreRanks={scoreRanks}
                  />
                )}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* ── Compact single-line legend ── */}
        <CompactLegend isMobile={isMobile} />
      </CardContent>
    </Card>
  );
}
