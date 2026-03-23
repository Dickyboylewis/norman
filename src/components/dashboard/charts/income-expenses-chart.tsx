"use client";

/**
 * Income vs Expenses Chart
 *
 * Grouped bar chart showing monthly income (dark red #C0392B) and
 * expenses (light red #E8A9A3) side by side for the last 12 months.
 * Includes dashed reference lines for average income and average expenses.
 * Fetches live data from /api/xero/income-expenses via TanStack Query.
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
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface MonthData {
  month: string;
  income: number;
  expenses: number;
}

interface IncomeExpensesData {
  months: MonthData[];
  avgIncome: number;
  avgExpenses: number;
  latestMonth: string;
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

async function fetchIncomeExpenses(): Promise<IncomeExpensesData> {
  const res = await fetch("/api/xero/income-expenses");
  if (!res.ok) throw new Error("Failed to fetch income/expenses");
  return res.json();
}

export function IncomeExpensesChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["xero-income-expenses"],
    queryFn: fetchIncomeExpenses,
    refetchInterval: 300_000, // 5 minutes
    retry: 1,
  });

  const connected = !isError && !!data?.connected;

  if (isLoading) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
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
              Income vs Expenses
            </CardTitle>
            <LiveIndicator connected={false} />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Could not load data from Xero.{" "}
            <a href="/api/xero/auth" className="text-[#C0392B] underline">
              Reconnect
            </a>
          </p>
        </CardHeader>
        <CardContent className="h-72 flex items-center justify-center">
          <p className="text-sm text-gray-400">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const latestMonth = data.latestMonth || "";

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Income vs Expenses
            </CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">
              Monthly ending {latestMonth} · Source: Xero
            </p>
          </div>
          <LiveIndicator connected={connected} />
        </div>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.months}
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
            {/* Average income reference line */}
            {data.avgIncome > 0 && (
              <ReferenceLine
                y={data.avgIncome}
                stroke="#C0392B"
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                label={{
                  value: `Avg Income: ${fmt(data.avgIncome)}`,
                  position: "insideTopRight",
                  fill: "#C0392B",
                  fontSize: 10,
                }}
              />
            )}
            {/* Average expenses reference line */}
            {data.avgExpenses > 0 && (
              <ReferenceLine
                y={data.avgExpenses}
                stroke="#E8A9A3"
                strokeDasharray="5 5"
                strokeOpacity={0.8}
                label={{
                  value: `Avg Expenses: ${fmt(data.avgExpenses)}`,
                  position: "insideBottomRight",
                  fill: "#c0392b",
                  fontSize: 10,
                }}
              />
            )}
            <Bar
              dataKey="income"
              name="Income"
              fill="#C0392B"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="#E8A9A3"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
