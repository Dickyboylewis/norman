"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StageRow {
  Code: string;
  Title: string;
  StageName: string;
  StageStatus: string;
  Fee: number;
  Pct: number;
  EarnedFee: number;
  Cost: number;
  LastWorked: string | null;
  StageProfit: number;
}

interface ProfitabilityResponse {
  projects: unknown[];
  stages: StageRow[];
}

interface WatchlistRow {
  stage: StageRow;
  impliedTotalCost: number;
  projectedOverrun: number;
  projectedMargin: number | null;
}

function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    return "£" + abs.toLocaleString("en-GB", { maximumFractionDigits: 0 });
  }
  return (
    "£" + abs.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function overrunBorder(overrun: number): string {
  if (overrun > 20000) return "border-red-700";
  if (overrun >= 5000) return "border-red-500";
  return "border-red-300";
}

function buildWatchlist(stages: StageRow[]): WatchlistRow[] {
  const rows: WatchlistRow[] = [];
  for (const stage of stages) {
    if (stage.StageStatus !== "Won") continue;
    if (!(stage.Pct > 0 && stage.Pct < 100)) continue;
    if (!(stage.Cost > 0)) continue;
    const impliedTotalCost = stage.Cost / (stage.Pct / 100);
    if (!(impliedTotalCost > stage.Fee)) continue;
    rows.push({
      stage,
      impliedTotalCost,
      projectedOverrun: impliedTotalCost - stage.Fee,
      projectedMargin:
        stage.Fee > 0 ? ((stage.Fee - impliedTotalCost) / stage.Fee) * 100 : null,
    });
  }
  return rows.sort((a, b) => b.projectedOverrun - a.projectedOverrun);
}

export default function StagesWatchlist() {
  const { data, isLoading } = useQuery<ProfitabilityResponse>({
    queryKey: ["profitability"],
    queryFn: async () => {
      const res = await fetch("/api/profitability");
      if (!res.ok) throw new Error("Failed to load profitability data");
      return res.json();
    },
    refetchInterval: 300_000,
  });

  const watchlist = useMemo(() => buildWatchlist(data?.stages ?? []), [data]);

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (watchlist.length === 0) {
    return (
      <Card className="bg-green-50 border border-green-200 rounded-xl shadow-sm">
        <CardContent className="flex items-center gap-3 py-6">
          <CircleCheck className="h-6 w-6 flex-shrink-0 text-green-600" />
          <p
            className="text-sm font-medium text-green-800"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            All stages tracking within budget
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle
          className="flex items-center gap-2 text-lg font-bold text-gray-900"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          <TriangleAlert className="h-5 w-5 text-amber-500" />
          Stages Heading for Trouble
        </CardTitle>
        <p className="text-xs text-gray-500" style={{ fontFamily: "Roboto, sans-serif" }}>
          Won stages where current burn rate projects an overrun
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "Roboto, sans-serif" }}>
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2 pl-3 pr-3 font-medium">Project</th>
                <th className="py-2 pr-3 font-medium">Stage</th>
                <th className="py-2 pr-3 text-right font-medium">Fee</th>
                <th className="py-2 pr-3 text-right font-medium">Cost So Far</th>
                <th className="py-2 pr-3 text-right font-medium">% Done</th>
                <th className="py-2 pr-3 text-right font-medium">Projected Total Cost</th>
                <th className="py-2 pr-1 text-right font-medium">Projected Overrun</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((row, i) => (
                <tr
                  key={`${row.stage.Code}-${row.stage.StageName}-${i}`}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <td
                    className={`border-l-4 py-2.5 pl-3 pr-3 ${overrunBorder(row.projectedOverrun)}`}
                  >
                    <span className="font-semibold text-gray-900">{row.stage.Code}</span>{" "}
                    <span className="text-gray-600">{row.stage.Title}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700">{row.stage.StageName.trim()}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-gray-900">
                    {fmtMoney(row.stage.Fee)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-gray-900">
                    {fmtMoney(row.stage.Cost)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-gray-700">
                    {Math.round(row.stage.Pct)}%
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-gray-900">
                    {fmtMoney(row.impliedTotalCost)}
                  </td>
                  <td className="py-2.5 pr-1 text-right font-semibold tabular-nums text-red-600">
                    -{fmtMoney(row.projectedOverrun)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
