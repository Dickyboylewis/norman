"use client";

/**
 * Profit & Loss Chart
 *
 * Grouped bar chart showing Revenue vs Costs per month from Xero P&L.
 * Fetches from /api/xero/profit-and-loss via TanStack Query.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "./live-indicator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthData {
  month: string;
  revenue: number;
  costs: number;
  netProfit: number;
}

interface ProfitLossData {
  months: MonthData[];
  fromDate: string;
  toDate: string;
  connected: boolean;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(v);

async function fetchProfitLoss(): Promise<ProfitLossData> {
  const res = await fetch("/api/xero/profit-and-loss");
  if (!res.ok) throw new Error("Failed to fetch profit and loss");
  return res.json();
}

export function ProfitAndLossChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["xero-profit-and-loss"],
    queryFn: fetchProfitLoss,
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
              Profit &amp; Loss
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

  const months = data.months || [];

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Profit &amp; Loss
          </CardTitle>
          <LiveIndicator connected={connected} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Revenue vs Costs · Last 12 months · Source: Xero</p>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={months}
            margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 11 }}
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
              formatter={(value: any) => [fmt(Number(value)), undefined]}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
            />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="#10B981"
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
            />
            <Bar
              dataKey="costs"
              name="Costs"
              fill="#C0392B"
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
