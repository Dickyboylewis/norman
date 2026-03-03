"use client";

/**
 * 6 Month Net Profit Total Widget
 *
 * Fetches the Profit & Loss report from Xero via /api/xero/profit-loss
 * and displays the 6-month net profit total with a per-month breakdown.
 * Shows a "Connect Xero" button if the account is not yet linked.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LinkIcon, Loader2 } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/xero/profit-loss");

        if (res.status === 401) {
          setConnected(false);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch");
        }

        const json: ProfitLossData = await res.json();
        setData(json);
        setConnected(true);
      } catch (err) {
        console.error("Net profit fetch error:", err);
        setError("Unable to load profit data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ─── Not connected state ────────────────────────────────────────────────────
  if (connected === false) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 text-center">
            6 Month Net Profit
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 gap-4">
          <p className="text-sm text-gray-500 text-center">
            Connect your Xero account to see live profit data.
          </p>
          <a
            href="/api/xero/connect"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#13B5EA] text-white text-sm font-medium hover:bg-[#0e9fd1] transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            Connect Xero
          </a>
        </CardContent>
      </Card>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 text-center">
            6 Month Net Profit
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 text-center">
            6 Month Net Profit
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-sm text-red-500">{error ?? "No data available"}</p>
        </CardContent>
      </Card>
    );
  }

  // ─── Connected — show data ──────────────────────────────────────────────────
  const isPositive = data.netProfit >= 0;

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 text-center">
          6 Month Net Profit
        </CardTitle>
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
              {formatCurrency(data.netProfit)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {data.fromDate} — {data.toDate}
          </p>
        </div>

        {/* Per-month breakdown */}
        {data.months.length > 0 && (
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
