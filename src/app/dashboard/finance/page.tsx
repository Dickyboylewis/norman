"use client";

/**
 * Finance Page
 *
 * Rebuilt with live Xero data via TanStack Query.
 * - Summary KPI cards from /api/xero/balance-summary
 * - Modular chart grid — easy to toggle charts on/off
 * - LiveIndicator on every card and chart
 */

import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/dashboard/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "@/components/dashboard/charts/live-indicator";
import { IncomeExpensesChart } from "@/components/dashboard/charts/income-expenses-chart";
import { FinanceIncomePlannerChart } from "@/components/dashboard/charts/finance-income-planner";
import { ExpenseBreakdownChart } from "@/components/dashboard/charts/expense-breakdown-chart";
import { CashflowTrendChart } from "@/components/dashboard/charts/cashflow-trend-chart";
import { ProfitAndLossChart } from "@/components/dashboard/charts/profit-and-loss-chart";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BalanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashflowBalance: number;
  revenueChange: string;
  expensesChange: string;
  netProfitChange: string;
  cashflowChange: string;
  connected: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(v);

async function fetchBalanceSummary(): Promise<BalanceSummary> {
  const res = await fetch("/api/xero/balance-summary");
  if (!res.ok) throw new Error("Failed to fetch balance summary");
  return res.json();
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  change,
  connected,
  loading,
}: {
  label: string;
  value: string;
  change: string;
  connected: boolean;
  loading: boolean;
}) {
  const isPositiveChange = change.startsWith("+");

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <LiveIndicator connected={connected} />
        </div>
        {loading ? (
          <>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900 font-[Poppins]">{value}</p>
            <p
              className={`text-xs mt-1 font-medium ${
                isPositiveChange ? "text-green-600" : "text-red-500"
              }`}
            >
              {change} vs last period
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["xero-balance-summary"],
    queryFn: fetchBalanceSummary,
    refetchInterval: 300_000,
    retry: 1,
  });

  const connected = !isError && !!data?.connected;
  const loading = isLoading;

  const kpis = [
    {
      label: "Total Revenue",
      value: data ? fmt(data.totalRevenue) : "—",
      change: data?.revenueChange ?? "+0.0%",
    },
    {
      label: "Total Expenses",
      value: data ? fmt(data.totalExpenses) : "—",
      change: data?.expensesChange ?? "+0.0%",
    },
    {
      label: "Net Profit",
      value: data ? fmt(data.netProfit) : "—",
      change: data?.netProfitChange ?? "+0.0%",
    },
    {
      label: "Cashflow Balance",
      value: data ? fmt(data.cashflowBalance) : "—",
      change: data?.cashflowChange ?? "+0.0%",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Finance" subtitle="Live data from Xero" />

      <div className="flex-1 p-8 bg-gray-50">
        {/* ── KPI Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              change={kpi.change}
              connected={connected}
              loading={loading}
            />
          ))}
        </div>

        {/* ── Chart Grid ── */}
        {/* To toggle a chart off, wrap it in a comment: {/* <ChartName /> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NEW: Income vs Expenses grouped bar chart */}
          <IncomeExpensesChart />

          {/* Income Planner — Cash In vs Cash Out */}
          <FinanceIncomePlannerChart />

          {/* Expense Breakdown — Pie chart of monthly costs */}
          <ExpenseBreakdownChart />

          {/* Cashflow Trend — Cumulative balance line chart */}
          <CashflowTrendChart />

          {/* Profit & Loss — Revenue vs Costs bar chart */}
          <ProfitAndLossChart />
        </div>
      </div>
    </div>
  );
}
