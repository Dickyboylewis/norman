"use client";

/**
 * Cashflow Trend Chart
 *
 * Line chart showing monthly cashflow balance trend from Xero.
 * Fetches from /api/xero/cashflow via TanStack Query.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "./live-indicator";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface MonthData {
  month: string;
  cashIn: number;
  cashOut: number;
}

interface CashflowData {
  months: MonthData[];
  totalCashIn: number;
  totalCashOut: number;
  difference: number;
  connected: boolean;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(v);

async function fetchCashflow(): Promise<CashflowData> {
  const res = await fetch("/api/xero/cashflow");
  if (!res.ok) throw new Error("Failed to fetch cashflow");
  return res.json();
}

export function CashflowTrendChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["xero-cashflow"],
    queryFn: fetchCashflow,
    refetchInterval: 300_000,
    retry: 1,
  });

  const connected = !isError && !!data?.connected;

  if (isLoading) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Cashflow Trend
            </CardTitle>
            <LiveIndicator connected={false} />
          </div>
        </CardHeader>
        <CardContent className="h-72 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-gray-400">Could not load data from Xero.</p>
          <a
            href="/api/xero/auth"
            className="px-4 py-1.5 bg-[#C0392B] text-white text-sm font-medium rounded-md"
          >
            Connect to Xero
          </a>
        </CardContent>
      </Card>
    );
  }

  // Build cumulative balance trend from cashflow data
  const months = data.months || [];
  let runningBalance = 0;
  const trendData = months.map((m) => {
    runningBalance += m.cashIn - m.cashOut;
    return {
      month: m.month,
      balance: Math.round(runningBalance * 100) / 100,
    };
  });

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Cashflow Trend
          </CardTitle>
          <LiveIndicator connected={connected} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Cumulative balance · Source: Xero</p>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData}
            margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: any) => [fmt(Number(value)), "Balance"]}
            />
            <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#C0392B"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#C0392B", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#C0392B" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
