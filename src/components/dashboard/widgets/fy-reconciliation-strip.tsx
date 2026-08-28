"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MonthCell {
  cost: number;
  invoiced: number;
}

interface FyProject {
  projectId: number | string;
  code: string;
  title: string;
  status: string;
  monthly: Record<string, MonthCell>;
  totalCost: number;
  totalInvoiced: number;
  net: number;
}

interface FyMonthlyResponse {
  success: boolean;
  fy: string;
  startDate: string;
  endDate: string;
  months: string[];
  projects: FyProject[];
}

interface XeroMonth {
  month: string;
  income: number;
  expenses: number;
}

interface XeroIncomeExpensesResponse {
  months: XeroMonth[];
  connected: boolean;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MONTH_LOOKUP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function monthHeader(month: string): string {
  const year = month.slice(2, 4);
  const monthIndex = parseInt(month.slice(5, 7), 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

// Xero P&L column headers come through raw ("Aug-25", "31 Aug 25", "August 2025"…);
// normalise whatever arrives to "YYYY-MM".
function xeroLabelToIso(label: string): string | null {
  const match = label.trim().match(/([A-Za-z]{3,})[\s-]+(\d{2,4})$/);
  if (!match) return null;
  const monthIndex = MONTH_LOOKUP[match[1].slice(0, 3).toLowerCase()];
  if (monthIndex === undefined) return null;
  let year = parseInt(match[2], 10);
  if (year < 100) year += 2000;
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function fmtMoney(v: number): string {
  const rounded = Math.round(v);
  const sign = rounded < 0 ? "-" : "";
  return sign + "£" + Math.abs(rounded).toLocaleString("en-GB");
}

export default function FyReconciliationStrip({ fy, months }: { fy: string; months: string[] }) {
  const monthlyQuery = useQuery<FyMonthlyResponse>({
    queryKey: ["fy-monthly", fy],
    queryFn: async () => {
      const res = await fetch(`/api/profitability/monthly?fy=${encodeURIComponent(fy)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const xeroQuery = useQuery<XeroIncomeExpensesResponse>({
    queryKey: ["xero-income-expenses"],
    queryFn: async () => {
      const res = await fetch("/api/xero/income-expenses");
      if (!res.ok) throw new Error("Failed to fetch Xero income/expenses");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const derived = useMemo(() => {
    const projInvoiced = new Map<string, number>();
    const projCost = new Map<string, number>();
    for (const month of months) {
      projInvoiced.set(month, 0);
      projCost.set(month, 0);
    }
    if (monthlyQuery.data) {
      for (const project of monthlyQuery.data.projects) {
        for (const month of months) {
          const cell = project.monthly[month];
          if (!cell) continue;
          projInvoiced.set(month, (projInvoiced.get(month) ?? 0) + cell.invoiced);
          projCost.set(month, (projCost.get(month) ?? 0) + cell.cost);
        }
      }
    }
    const xeroNet = new Map<string, number>();
    for (const m of xeroQuery.data?.months ?? []) {
      const iso = xeroLabelToIso(m.month);
      if (iso) xeroNet.set(iso, m.income - m.expenses);
    }
    return { projInvoiced, projCost, xeroNet };
  }, [monthlyQuery.data, xeroQuery.data, months]);

  if (monthlyQuery.isPending) {
    return (
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (monthlyQuery.isError) {
    return (
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardContent className="py-4">
          <div className="rounded-lg bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-700" style={{ fontFamily: "Roboto, sans-serif" }}>
              Could not load reconciliation data
            </p>
            <p className="mt-0.5 text-xs text-red-500" style={{ fontFamily: "Roboto, sans-serif" }}>
              {monthlyQuery.error instanceof Error ? monthlyQuery.error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { projInvoiced, projCost, xeroNet } = derived;

  const totals = {
    invoiced: months.reduce((s, m) => s + (projInvoiced.get(m) ?? 0), 0),
    cost: months.reduce((s, m) => s + (projCost.get(m) ?? 0), 0),
  };
  const contributionTotal = totals.invoiced - totals.cost;
  const xeroMonthsPresent = months.filter(m => xeroNet.has(m));
  const xeroTotal = xeroMonthsPresent.reduce((s, m) => s + (xeroNet.get(m) ?? 0), 0);
  const gapTotal = xeroMonthsPresent.reduce(
    (s, m) => s + ((projInvoiced.get(m) ?? 0) - (projCost.get(m) ?? 0) - (xeroNet.get(m) ?? 0)),
    0,
  );

  const numCell = (v: number, cls: string, key: string) => (
    <td key={key} className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${cls}`}>
      {fmtMoney(v)}
    </td>
  );

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle
          className="flex items-center gap-2 text-lg font-bold text-gray-900"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          <Scale className="h-5 w-5 text-red-600" />
          Company Reconciliation
        </CardTitle>
        <p className="text-xs text-gray-500" style={{ fontFamily: "Roboto, sans-serif" }}>
          CMap project contribution vs Xero actual · monthly
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "Roboto, sans-serif" }}>
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left font-medium" />
                {months.map(month => (
                  <th key={month} className="whitespace-nowrap px-2 py-2 text-right font-medium">
                    {monthHeader(month)}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-bold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="sticky left-0 z-10 bg-white py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">
                  Project invoiced
                </td>
                {months.map(m => numCell(projInvoiced.get(m) ?? 0, "text-gray-900", m))}
                {numCell(totals.invoiced, "font-bold text-gray-900", "total")}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="sticky left-0 z-10 bg-white py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">
                  Project cost
                </td>
                {months.map(m => numCell(projCost.get(m) ?? 0, "text-gray-900", m))}
                {numCell(totals.cost, "font-bold text-gray-900", "total")}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="sticky left-0 z-10 bg-white py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">
                  Contribution
                </td>
                {months.map(m => {
                  const v = (projInvoiced.get(m) ?? 0) - (projCost.get(m) ?? 0);
                  return numCell(v, v >= 0 ? "text-green-700" : "text-red-600", m);
                })}
                {numCell(
                  contributionTotal,
                  `font-bold ${contributionTotal >= 0 ? "text-green-700" : "text-red-600"}`,
                  "total",
                )}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="sticky left-0 z-10 bg-white py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">
                  Xero net profit
                </td>
                {months.map(m => {
                  if (!xeroNet.has(m)) {
                    return (
                      <td key={m} className="px-2 py-2 text-right text-gray-300">
                        –
                      </td>
                    );
                  }
                  const v = xeroNet.get(m) ?? 0;
                  return numCell(v, v >= 0 ? "text-gray-900" : "text-red-600", m);
                })}
                {xeroMonthsPresent.length ? (
                  numCell(
                    xeroTotal,
                    `font-bold ${xeroTotal >= 0 ? "text-gray-900" : "text-red-600"}`,
                    "total",
                  )
                ) : (
                  <td className="px-2 py-2 text-right text-gray-300">–</td>
                )}
              </tr>
              <tr>
                <td className="sticky left-0 z-10 bg-white py-2 pr-3 font-medium text-gray-500 whitespace-nowrap">
                  Overhead gap
                </td>
                {months.map(m => {
                  if (!xeroNet.has(m)) {
                    return (
                      <td key={m} className="px-2 py-2 text-right text-gray-300">
                        –
                      </td>
                    );
                  }
                  const v =
                    (projInvoiced.get(m) ?? 0) - (projCost.get(m) ?? 0) - (xeroNet.get(m) ?? 0);
                  return numCell(v, "text-gray-500", m);
                })}
                {xeroMonthsPresent.length ? (
                  numCell(gapTotal, "font-bold text-gray-500", "total")
                ) : (
                  <td className="px-2 py-2 text-right text-gray-300">–</td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400" style={{ fontFamily: "Roboto, sans-serif" }}>
          Xero rows cover the months Xero reports; older months show –. Overhead gap ≈ what
          projects must earn before the practice breaks even.
        </p>
      </CardContent>
    </Card>
  );
}
