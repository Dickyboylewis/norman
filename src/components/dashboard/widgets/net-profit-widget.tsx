"use client";

/**
 * Net Profit Widget
 *
 * Displays Year-to-Date (YTD) Net Profit from Xero with a monthly breakdown.
 *
 * Architecture:
 *  - TanStack Query (useQuery) for data fetching with 5-minute refetch interval
 *  - Skeleton loaders during initial fetch
 *  - "Connect to Xero" button if auth is missing
 *  - UK Sterling (£) formatting with comma separators
 *  - Poppins for the headline, Roboto for numbers (via CSS variables)
 *  - LiveIndicator component for the pulsing "Live" badge
 *  - Financial Year date range displayed under the headline
 *  - Year-over-Year (YoY) comparison with directional arrow
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "@/components/dashboard/charts/live-indicator";
import { TrendingUp, TrendingDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthData {
  month: string;
  netProfit: number;
}

interface NetProfitData {
  netProfit: number;
  months: MonthData[];
  fromDate: string;
  toDate: string;
  previousFromDate?: string;
  previousToDate?: string;
  previousNetProfit?: number;
  yoyPercent?: number | null;
  connected: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

async function fetchNetProfit(): Promise<NetProfitData> {
  const res = await fetch("/api/xero/net-profit");

  // Read as text first to prevent crashes on non-JSON responses
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("XERO_NOT_CONNECTED");
  }

  if (!res.ok || json?.error) {
    // Surface auth errors so the widget can show the connect button
    throw new Error(json?.error ?? "FETCH_ERROR");
  }

  return json as NetProfitData;
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function NetProfitWidget() {
  const { data, isLoading, isError, error } = useQuery<NetProfitData, Error>({
    queryKey: ["xero-net-profit"],
    queryFn: fetchNetProfit,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    staleTime: 60 * 1000, // 1 minute
  });

  // Determine if this is an auth error (show connect button) vs a generic error
  const needsAuth =
    isError &&
    (error?.message?.includes("not connected") ||
      error?.message === "XERO_NOT_CONNECTED" ||
      error?.message === "Xero not connected");

  // ── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle
              className="text-lg font-semibold text-gray-900"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              YTD Net Profit
            </CardTitle>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              Syncing with Xero...
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Headline skeleton */}
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
          {/* Monthly breakdown skeletons */}
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between px-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Auth / Connect State ───────────────────────────────────────────────────
  if (needsAuth || (isError && !data)) {
    return (
      <Card className="shadow-sm border-gray-200 h-[450px] flex flex-col items-center justify-center gap-4">
        <CardTitle
          className="text-lg font-semibold text-gray-900"
          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
        >
          Xero Disconnected
        </CardTitle>
        <p className="text-sm text-gray-500 text-center max-w-sm px-4">
          Norman needs your permission to securely read White Red&apos;s live
          Net Profit data.
        </p>
        <a
          href="/api/xero/auth"
          className="px-6 py-2 bg-[#13b5ea] hover:bg-[#0da0d1] text-white font-semibold rounded-md shadow transition-colors"
        >
          Connect to Xero
        </a>
      </Card>
    );
  }

  // ── Live Data State ────────────────────────────────────────────────────────
  const ytdTotal = data?.netProfit ?? 0;
  const isPositive = ytdTotal >= 0;
  const months = data?.months ?? [];

  // YoY
  const yoyPercent = data?.yoyPercent ?? null;
  const yoyPositive = yoyPercent !== null && yoyPercent >= 0;
  const yoyAbsolute = yoyPercent !== null ? Math.abs(yoyPercent) : null;

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            YTD Net Profit
          </CardTitle>
          <LiveIndicator connected={data?.connected ?? false} />
        </div>
      </CardHeader>

      <CardContent>
        {/* ── Big YTD Headline ── */}
        <div className="flex flex-col items-center justify-center py-5 gap-1">
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-7 h-7 text-green-600 flex-shrink-0" />
            ) : (
              <TrendingDown className="w-7 h-7 text-red-600 flex-shrink-0" />
            )}
            <span
              className={`text-4xl font-bold tracking-tight ${
                isPositive ? "text-green-700" : "text-red-700"
              }`}
              style={{ fontFamily: "var(--font-roboto), Roboto, sans-serif" }}
            >
              {formatCurrency(ytdTotal)}
            </span>
          </div>

          {/* Financial Year date range */}
          {data?.fromDate && data?.toDate && (
            <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
              {data.fromDate} — {data.toDate}
            </p>
          )}

          {/* YoY comparison */}
          {yoyAbsolute !== null && data?.previousFromDate && data?.previousToDate && (
            <p
              className={`text-xs font-semibold mt-1 ${
                yoyPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {yoyPositive ? "↑" : "↓"}{" "}
              {yoyPositive ? "Up" : "Down"} {yoyAbsolute}% from{" "}
              {data.previousFromDate} — {data.previousToDate}
            </p>
          )}

          {/* YTD badge */}
          <span className="mt-3 inline-flex items-center rounded-full bg-green-50 border border-green-200 px-3 py-0.5 text-xs font-semibold text-green-700 uppercase tracking-wider">
            Year to Date
          </span>
        </div>

        {/* ── Monthly Breakdown ── */}
        {months.length > 0 && (
          <div className="mt-4 rounded-lg border border-gray-100 overflow-hidden">
            {/* Header row */}
            <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-100">
              <span
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                Month
              </span>
              <span
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                Net Profit
              </span>
            </div>

            {/* Month rows */}
            <div className="divide-y divide-gray-50">
              {months.map((m, idx) => {
                const positive = m.netProfit >= 0;
                return (
                  <div
                    key={`${m.month}-${idx}`}
                    className="flex justify-between items-center px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <span
                      className="text-sm text-gray-700 font-medium"
                      style={{
                        fontFamily: "var(--font-poppins), Poppins, sans-serif",
                      }}
                    >
                      {m.month}
                    </span>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        positive ? "text-green-600" : "text-red-600"
                      }`}
                      style={{
                        fontFamily: "var(--font-roboto), Roboto, sans-serif",
                      }}
                    >
                      {formatCurrency(m.netProfit)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Total row */}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t border-gray-200">
              <span
                className="text-sm font-bold text-gray-800"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                YTD Total
              </span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  isPositive ? "text-green-700" : "text-red-700"
                }`}
                style={{ fontFamily: "var(--font-roboto), Roboto, sans-serif" }}
              >
                {formatCurrency(ytdTotal)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
