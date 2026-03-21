"use client";

/**
 * 6 Month Net Profit Total Widget
 *
 * Fetches live Profit & Loss data from Xero via /api/xero/net-profit.
 * Uses the same robust architecture as IncomePlannerChart:
 *  - res.text() → safe JSON parse to prevent Next.js crashes
 *  - needsAuth state with a "Connect to Xero" button
 *  - Loading / error / live-data states
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MonthData {
  month: string;
  netProfit: number;
}

interface ProfitLossData {
  netProfit: number;
  months: MonthData[];
  fromDate: string;
  toDate: string;
  connected: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

export function NetProfitWidget() {
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    fetch("/api/xero/net-profit")
      .then(async (res) => {
        // 1. Read raw text first to prevent Next.js from crashing on bad data
        const textData = await res.text();

        let jsonData: any;
        try {
          // 2. Safely parse to JSON
          jsonData = JSON.parse(textData);
        } catch (err) {
          console.error("Backend sent non-JSON. Forcing auth button.");
          setNeedsAuth(true);
          setLoading(false);
          return;
        }

        // 3. Check for auth errors
        if (!res.ok || jsonData.error) {
          setNeedsAuth(true);
          setLoading(false);
          return;
        }

        setData(jsonData as ProfitLossData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Net Profit data", err);
        setNeedsAuth(true);
        setLoading(false);
      });
  }, []);

  // ─── UI STATE 1: LOADING ────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="shadow-sm border-gray-200 h-[450px] flex items-center justify-center">
        <div className="text-gray-400 font-medium animate-pulse">
          Checking Xero Connection...
        </div>
      </Card>
    );
  }

  // ─── UI STATE 2: NEEDS AUTH (THE MAGIC BUTTON) ──────────────────────────────
  if (needsAuth) {
    return (
      <Card className="shadow-sm border-gray-200 h-[450px] flex flex-col items-center justify-center gap-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Xero Disconnected
        </CardTitle>
        <p className="text-sm text-gray-500 text-center max-w-sm">
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

  // ─── UI STATE 3: LIVE DATA ──────────────────────────────────────────────────
  const isPositive = (data?.netProfit ?? 0) >= 0;

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-900 text-center">
            6 Month Net Profit
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Live Data
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Big total */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-6 h-6 text-green-600" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-600" />
            )}
            <span
              className={`text-4xl font-bold ${
                isPositive ? "text-green-700" : "text-red-700"
              }`}
            >
              {formatCurrency(data?.netProfit ?? 0)}
            </span>
          </div>
          {data?.fromDate && data?.toDate && (
            <p className="text-xs text-gray-500 mt-1">
              {data.fromDate} — {data.toDate}
            </p>
          )}
        </div>

        {/* Per-month breakdown */}
        {data?.months && data.months.length > 0 && (
          <div className="mt-4 space-y-1">
            {data.months.map((m) => (
              <div
                key={m.month}
                className="flex justify-between text-sm px-1"
              >
                <span className="text-gray-600">{m.month}</span>
                <span
                  className={`font-medium ${
                    m.netProfit >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(m.netProfit)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
