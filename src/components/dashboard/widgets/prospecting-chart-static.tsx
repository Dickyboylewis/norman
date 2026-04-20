"use client";

/**
 * ProspectingChartStatic — Pure HTML/CSS Chart for Puppeteer Screenshots
 *
 * This is a static, non-animated version of the prospecting chart built with
 * plain HTML divs and inline styles. NO Recharts, NO SVG, NO canvas.
 * 
 * Used exclusively for automated screenshots by Puppeteer in headless Chromium.
 * Renders perfectly with zero JavaScript animation dependencies.
 * 
 * POINTS SYSTEM:
 * - Appointments = 5 points each
 * - Needs Follow up = 2 points each
 * - Attempted to Contact = 1 point each
 * - New Lead = 0 points (no score value)
 * 
 * The number shown above each bar is the total POINTS, not raw appointment count.
 * Medal ranking (🥇🥈🥉) is based on points totals.
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Avatar map ─────────────────────────────────────────────────────────────
const PERSON_META: Record<string, { avatar: string; firstName: string }> = {
  "Joe Haire":     { avatar: "/joe.png",   firstName: "Joe"   },
  "Jesus Jimenez": { avatar: "/jesus.png", firstName: "Jesus" },
  "Dicky Lewis":   { avatar: "/dicky.png", firstName: "Dicky" },
};

// ── Legend config ──────────────────────────────────────────────────────────
const LEGEND_ITEMS = [
  { color: "#34D399", label: "Appointments" },
  { color: "#FBCFE8", label: "Attempted to Contact" },
  { color: "#F97316", label: "Needs Follow up" },
  { color: "#FBBF24", label: "New Lead" },
];

// ── Medal helpers ──────────────────────────────────────────────────────────
type MedalInfo = { emoji: string; color: string };

function getMedalInfo(rank: number): MedalInfo {
  if (rank === 1) return { emoji: "🥇", color: "#EAB308" }; // gold
  if (rank === 2) return { emoji: "🥈", color: "#94A3B8" }; // silver
  if (rank === 3) return { emoji: "🥉", color: "#D97706" }; // bronze
  return { emoji: "", color: "#9CA3AF" };
}

function computeScoreRanks(data: any[]): Record<number, number> {
  const uniqueScores = Array.from(
    new Set(
      data
        .map((d) => d["_points"] ?? 0)
        .filter((s) => s > 0)
    )
  ).sort((a, b) => b - a);

  const scoreRankMap: Record<number, number> = {};
  uniqueScores.forEach((score, idx) => {
    scoreRankMap[score] = idx + 1;
  });

  return scoreRankMap;
}

// ── Main component ─────────────────────────────────────────────────────────
export function ProspectingChartStatic() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Enrich data with computed _points field
  const enrichedData = data.map((d: any) => ({
    ...d,
    _points: (d["Appointments"] ?? 0) * 5 + (d["Needs Follow up"] ?? 0) * 2 + (d["Attempted to Contact"] ?? 0) * 1,
  }));

  // Compute score → rank map
  const scoreRanks = computeScoreRanks(enrichedData);

  // Calculate max total for scaling
  const maxTotal = Math.max(
    ...enrichedData.map((d) => 
      (d["New Lead"] ?? 0) + 
      (d["Needs Follow up"] ?? 0) + 
      (d["Attempted to Contact"] ?? 0) + 
      (d["Appointments"] ?? 0)
    ),
    1 // Minimum 1 to avoid division by zero
  );

  const MAX_BAR_HEIGHT = 200; // pixels

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
        <div style={{ padding: "28px 16px 16px 40px" }}>
          {/* Chart container with Y-axis */}
          <div style={{ display: "flex", gap: "16px" }}>
            {/* Y-axis */}
            <div style={{ 
              display: "flex", 
              flexDirection: "column-reverse", 
              justifyContent: "space-between",
              height: `${MAX_BAR_HEIGHT}px`,
              paddingBottom: "4px"
            }}>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const value = Math.round((maxTotal / 5) * i);
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: "11px",
                      color: "#9ca3af",
                      fontFamily: "var(--font-roboto), Roboto, sans-serif",
                      textAlign: "right",
                      paddingRight: "8px",
                      lineHeight: "1",
                    }}
                  >
                    {value}
                  </div>
                );
              })}
            </div>

            {/* Bars container */}
            <div style={{ 
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "32px",
              alignItems: "flex-end",
            }}>
              {enrichedData.map((person) => {
                const name = person.name;
                const meta = PERSON_META[name];
                if (!meta) return null;

                const newLead = person["New Lead"] ?? 0;
                const needsFollowUp = person["Needs Follow up"] ?? 0;
                const attemptedContact = person["Attempted to Contact"] ?? 0;
                const appointments = person["Appointments"] ?? 0;
                const total = newLead + needsFollowUp + attemptedContact + appointments;

                // Calculate heights proportionally
                const scale = total > 0 ? MAX_BAR_HEIGHT / maxTotal : 0;
                const newLeadHeight = newLead * scale;
                const needsFollowUpHeight = needsFollowUp * scale;
                const attemptedContactHeight = attemptedContact * scale;
                const appointmentsHeight = appointments * scale;

                // Medal info based on POINTS
                const points = person["_points"] ?? 0;
                const rank = points > 0 ? (scoreRanks[points] ?? 99) : 99;
                const medal = getMedalInfo(rank);

                return (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    {/* Points label */}
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: points === 0 ? "#9CA3AF" : medal.color,
                        fontFamily: "var(--font-roboto), Roboto, sans-serif",
                        minHeight: "20px",
                      }}
                    >
                      {points === 0 ? "0" : `${medal.emoji}${points}`}
                    </div>

                    {/* Stacked bar */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column-reverse",
                        width: "60px",
                        minHeight: "4px",
                      }}
                    >
                      {/* New Lead (bottom, yellow) */}
                      {newLeadHeight > 0 && (
                        <div
                          data-testid="chart-bar"
                          style={{
                            backgroundColor: "#FBBF24",
                            height: `${newLeadHeight}px`,
                            width: "60px",
                            borderRadius: appointmentsHeight === 0 && attemptedContactHeight === 0 && needsFollowUpHeight === 0 ? "4px 4px 4px 4px" : "0 0 4px 4px",
                          }}
                        />
                      )}

                      {/* Needs Follow up (orange) */}
                      {needsFollowUpHeight > 0 && (
                        <div
                          data-testid="chart-bar"
                          style={{
                            backgroundColor: "#F97316",
                            height: `${needsFollowUpHeight}px`,
                            width: "60px",
                            borderRadius: newLeadHeight === 0 ? "0 0 4px 4px" : "0",
                          }}
                        />
                      )}

                      {/* Attempted to Contact (pink) */}
                      {attemptedContactHeight > 0 && (
                        <div
                          data-testid="chart-bar"
                          style={{
                            backgroundColor: "#FBCFE8",
                            height: `${attemptedContactHeight}px`,
                            width: "60px",
                            borderRadius: newLeadHeight === 0 && needsFollowUpHeight === 0 ? "0 0 4px 4px" : "0",
                          }}
                        />
                      )}

                      {/* Appointments (top, green) */}
                      {appointmentsHeight > 0 && (
                        <div
                          data-testid="chart-bar"
                          style={{
                            backgroundColor: "#34D399",
                            height: `${appointmentsHeight}px`,
                            width: "60px",
                            borderRadius: "4px 4px 0 0",
                          }}
                        />
                      )}
                    </div>

                    {/* Avatar */}
                    <img
                      src={meta.avatar}
                      alt={meta.firstName}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        border: "1.5px solid #e5e7eb",
                        objectFit: "cover",
                      }}
                    />

                    {/* First name */}
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#374151",
                        fontFamily: "var(--font-poppins), Poppins, sans-serif",
                      }}
                    >
                      {meta.firstName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "nowrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "14px",
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
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: item.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  color: "#6B7280",
                  fontFamily: "var(--font-poppins), Poppins, sans-serif",
                  fontWeight: 500,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
