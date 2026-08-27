"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Metric = "invoiced" | "cost" | "net";

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

const FY_TABS = ["2024-25", "2025-26", "2026-27"];

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "invoiced", label: "Invoiced" },
  { value: "cost", label: "Cost" },
  { value: "net", label: "Net" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function currentFy(): string {
  const now = new Date();
  const startYear = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

function monthHeader(month: string): string {
  const year = month.slice(2, 4);
  const monthIndex = parseInt(month.slice(5, 7), 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

function cellMetric(cell: MonthCell, metric: Metric): number {
  if (metric === "invoiced") return cell.invoiced;
  if (metric === "cost") return cell.cost;
  return cell.invoiced - cell.cost;
}

function projectTotal(project: FyProject, metric: Metric): number {
  if (metric === "invoiced") return project.totalInvoiced;
  if (metric === "cost") return project.totalCost;
  return project.net;
}

function fmtMoney(v: number): string {
  const rounded = Math.round(v);
  const sign = rounded < 0 ? "-" : "";
  return sign + "£" + Math.abs(rounded).toLocaleString("en-GB");
}

function valueClass(v: number, metric: Metric): string {
  if (Math.round(v) < 0) return "text-red-600";
  if (metric === "net") return "text-green-700";
  return "text-gray-900";
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            value === option.value
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function FyMonthlyReport() {
  const [fy, setFy] = useState<string>(() =>
    FY_TABS.includes(currentFy()) ? currentFy() : FY_TABS[FY_TABS.length - 1],
  );
  const [metric, setMetric] = useState<Metric>("net");

  const { data, isPending, isError, error } = useQuery<FyMonthlyResponse>({
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

  const sortedProjects = useMemo(() => {
    if (!data) return [];
    return [...data.projects].sort((a, b) => projectTotal(b, metric) - projectTotal(a, metric));
  }, [data, metric]);

  const columnTotals = useMemo(() => {
    if (!data) return { perMonth: new Map<string, number>(), grand: 0 };
    const perMonth = new Map<string, number>();
    let grand = 0;
    for (const month of data.months) perMonth.set(month, 0);
    for (const project of data.projects) {
      for (const month of data.months) {
        const cell = project.monthly[month];
        if (!cell) continue;
        perMonth.set(month, (perMonth.get(month) ?? 0) + cellMetric(cell, metric));
      }
      grand += projectTotal(project, metric);
    }
    return { perMonth, grand };
  }, [data, metric]);

  const startYear = data?.startDate?.slice(0, 4) ?? fy.slice(0, 4);
  const endYear = String(parseInt(startYear, 10) + 1);

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle
              className="flex items-center gap-2 text-lg font-bold text-gray-900"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              <CalendarRange className="h-5 w-5 text-red-600" />
              FY Project Report
            </CardTitle>
            <p className="text-xs text-gray-500" style={{ fontFamily: "Roboto, sans-serif" }}>
              1 Aug {startYear} to 31 Jul {endYear} · Invoiced vs cost by month
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <PillGroup
              options={FY_TABS.map(tab => ({ value: tab, label: tab }))}
              value={fy}
              onChange={setFy}
            />
            <PillGroup options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        ) : isError ? (
          <div className="rounded-lg bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-700" style={{ fontFamily: "Roboto, sans-serif" }}>
              Could not load FY data
            </p>
            <p className="mt-0.5 text-xs text-red-500" style={{ fontFamily: "Roboto, sans-serif" }}>
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        ) : data ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "Roboto, sans-serif" }}>
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="sticky left-0 z-10 bg-white py-2 pr-3 text-left font-medium">
                    Project
                  </th>
                  {data.months.map(month => (
                    <th key={month} className="whitespace-nowrap px-2 py-2 text-right font-medium">
                      {monthHeader(month)}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right font-bold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map(project => {
                  const total = projectTotal(project, metric);
                  return (
                    <tr key={String(project.projectId)} className="border-b border-gray-100">
                      <td className="sticky left-0 z-10 max-w-[240px] bg-white py-2 pr-3">
                        <span className="font-semibold text-gray-900">{project.code}</span>{" "}
                        <span className="text-gray-600">{project.title}</span>
                        {project.status !== "Project" && (
                          <span className="ml-1.5 inline-block rounded-full bg-gray-200 px-1.5 py-0.5 align-middle text-[10px] font-medium text-gray-600">
                            Closed
                          </span>
                        )}
                      </td>
                      {data.months.map(month => {
                        const cell = project.monthly[month];
                        if (!cell) {
                          return (
                            <td key={month} className="px-2 py-2 text-right text-gray-300">
                              –
                            </td>
                          );
                        }
                        const v = cellMetric(cell, metric);
                        return (
                          <td
                            key={month}
                            className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${valueClass(v, metric)}`}
                          >
                            {fmtMoney(v)}
                          </td>
                        );
                      })}
                      <td
                        className={`whitespace-nowrap px-2 py-2 text-right font-bold tabular-nums ${valueClass(total, metric)}`}
                      >
                        {fmtMoney(total)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className="sticky left-0 z-10 bg-white py-2 pr-3 text-gray-900">
                    All projects
                  </td>
                  {data.months.map(month => {
                    const v = columnTotals.perMonth.get(month) ?? 0;
                    return (
                      <td
                        key={month}
                        className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${valueClass(v, metric)}`}
                      >
                        {fmtMoney(v)}
                      </td>
                    );
                  })}
                  <td
                    className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${valueClass(columnTotals.grand, metric)}`}
                  >
                    {fmtMoney(columnTotals.grand)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
