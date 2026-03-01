"use client";

/**
 * QuickBooks Income Planner Widget
 *
 * Fetches data from /api/quickbooks using TanStack Query and displays:
 * - Total income, expenses, and net income KPI cards
 * - A monthly projection bar chart (CSS-based, no extra chart library needed)
 *
 * To connect real data: update /api/quickbooks/route.ts with your API calls.
 */

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import type { QuickBooksData } from "@/app/api/quickbooks/route";

// ─── Data Fetcher ──────────────────────────────────────────────────────────────

async function fetchQuickBooksData(): Promise<QuickBooksData> {
  const res = await fetch("/api/quickbooks");
  if (!res.ok) throw new Error("Failed to fetch QuickBooks data");
  return res.json();
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function QuickBooksWidget() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quickbooks"],
    queryFn: fetchQuickBooksData,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="col-span-1 lg:col-span-2 border-red-200 dark:border-red-800">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-slate-500">Failed to load QuickBooks data</p>
          <button
            onClick={() => refetch()}
            className="text-xs text-blue-500 hover:underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  const maxProjected = Math.max(...data.monthlyProjections.map((m) => m.projected));

  return (
    <Card className="col-span-1 lg:col-span-2 overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* QuickBooks green accent */}
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Income Planner</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                QuickBooks · {data.period}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            Live
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total Income */}
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/50">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">
              Total Income
            </p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(data.totalIncome, data.currency)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-500">+8.2% vs last period</span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 p-4 border border-red-100 dark:border-red-900/50">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
              Expenses
            </p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(data.totalExpenses, data.currency)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-500">+3.1% vs last period</span>
            </div>
          </div>

          {/* Net Income */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-100 dark:border-blue-900/50">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
              Net Income
            </p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(data.netIncome, data.currency)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-500">Margin: {Math.round((data.netIncome / data.totalIncome) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Monthly Projection Chart */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
            Monthly Projection vs Actual
          </p>
          <div className="flex items-end gap-2 h-28">
            {data.monthlyProjections.map((month) => {
              const projectedHeight = (month.projected / maxProjected) * 100;
              const actualHeight = month.actual
                ? (month.actual / maxProjected) * 100
                : 0;

              return (
                <div
                  key={month.month}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div className="w-full flex items-end gap-0.5 h-24">
                    {/* Projected bar */}
                    <div
                      className="flex-1 rounded-t-sm bg-slate-200 dark:bg-slate-700 transition-all duration-500"
                      style={{ height: `${projectedHeight}%` }}
                      title={`Projected: ${formatCurrency(month.projected, data.currency)}`}
                    />
                    {/* Actual bar */}
                    {month.actual !== null ? (
                      <div
                        className="flex-1 rounded-t-sm bg-emerald-400 dark:bg-emerald-500 transition-all duration-500"
                        style={{ height: `${actualHeight}%` }}
                        title={`Actual: ${formatCurrency(month.actual, data.currency)}`}
                      />
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{month.month}</span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">Projected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-400" />
              <span className="text-xs text-slate-400">Actual</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
