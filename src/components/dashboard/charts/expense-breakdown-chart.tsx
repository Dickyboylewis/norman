"use client";

/**
 * Expense Breakdown Chart
 *
 * Pie chart showing expense categories from Xero P&L.
 * Fetches from /api/xero/profit-and-loss via TanStack Query.
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "./live-indicator";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

const PIE_COLORS = ["#C0392B", "#E8A9A3", "#8B1A1A", "#F4C2C2", "#6B0F0F", "#FADADD"];

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

export function ExpenseBreakdownChart() {
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
              Expense Breakdown
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

  // Build pie data from monthly costs — show top months by cost
  const months = data.months || [];
  const pieData = months
    .filter((m) => m.costs > 0)
    .map((m) => ({ name: m.month, value: m.costs }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const totalCosts = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Expense Breakdown
          </CardTitle>
          <LiveIndicator connected={connected} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Monthly costs · Source: Xero</p>
      </CardHeader>
      <CardContent className="h-72">
        {pieData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-400">No expense data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label={(props: any) =>
                  `${props.name ?? ""} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [fmt(Number(value)), "Costs"]}
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
