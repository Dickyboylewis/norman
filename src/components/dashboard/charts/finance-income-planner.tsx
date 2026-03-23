"use client";

/**
 * Finance Income Planner Chart (Finance page version)
 *
 * Shows Cash In vs Cash Out per month from Xero BankSummary.
 * Fetches from /api/xero/cashflow via TanStack Query.
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
  Cell,
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

function getMonthColor(diff: number, maxAbs: number): string {
  const t = maxAbs === 0 ? 0 : Math.abs(diff) / maxAbs;
  if (diff >= 0) {
    return `hsl(142, 71%, ${85 - t * 50}%)`;
  }
  return `hsl(0, 72%, ${85 - t * 50}%)`;
}

async function fetchCashflow(): Promise<CashflowData> {
  const res = await fetch("/api/xero/cashflow");
  if (!res.ok) throw new Error("Failed to fetch cashflow");
  return res.json();
}

export function FinanceIncomePlannerChart() {
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
              Income Planner
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
  const diffs = months.map((m) => m.cashIn - m.cashOut);
  const maxAbsDiff = Math.max(...diffs.map(Math.abs), 1);
  const isPositive = (data.difference ?? 0) >= 0;

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Income Planner
          </CardTitle>
          <LiveIndicator connected={connected} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Cash in and out · Last 6 months · Source: Xero</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-lg font-bold text-gray-900">{fmt(data.totalCashIn ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Cash in</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#C0392B]">{fmt(data.totalCashOut ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Cash out</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${isPositive ? "text-green-700" : "text-red-700"}`}>
              {fmt(data.difference ?? 0)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Difference</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
              formatter={(value: any) => [fmt(Number(value)), undefined]}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
            <Bar dataKey="cashIn" name="Cash in" radius={[4, 4, 0, 0]}>
              {months.map((_m, i) => (
                <Cell key={i} fill={getMonthColor(diffs[i], maxAbsDiff)} />
              ))}
            </Bar>
            <Bar dataKey="cashOut" name="Cash out" radius={[4, 4, 0, 0]}>
              {months.map((_m, i) => (
                <Cell key={i} fill={getMonthColor(diffs[i], maxAbsDiff)} opacity={0.45} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
