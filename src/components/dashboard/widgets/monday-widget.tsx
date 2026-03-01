"use client";

/**
 * Monday.com Leads Summary Widget
 *
 * Fetches data from /api/monday using TanStack Query and displays:
 * - Pipeline summary stats (total leads, active, total value)
 * - A list of recent leads with status badges and assignees
 *
 * To connect real data: update /api/monday/route.ts with your API calls.
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
import { Users, AlertCircle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MondayData, LeadStatus } from "@/app/api/monday/route";

// ─── Data Fetcher ──────────────────────────────────────────────────────────────

async function fetchMondayData(): Promise<MondayData> {
  const res = await fetch("/api/monday");
  if (!res.ok) throw new Error("Failed to fetch Monday.com data");
  return res.json();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusConfig: Record<
  LeadStatus,
  { label: string; color: string; dot: string }
> = {
  "New Lead": {
    label: "New Lead",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  Contacted: {
    label: "Contacted",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-400",
  },
  "Proposal Sent": {
    label: "Proposal Sent",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  Negotiating: {
    label: "Negotiating",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    dot: "bg-purple-400",
  },
  Won: {
    label: "Won",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  Lost: {
    label: "Lost",
    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-400",
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function MondayWidget() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["monday"],
    queryFn: fetchMondayData,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-slate-500">Failed to load Monday.com data</p>
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Monday.com red accent */}
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Leads Summary</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Monday.com · {data.boardName}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {data.activeLeads} Active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.totalLeads}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Total Leads</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.activeLeads}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Active</p>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {formatCurrency(data.totalPipelineValue, data.currency)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Pipeline</p>
          </div>
        </div>

        {/* Leads List */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            Recent Leads
          </p>
          <ul className="space-y-2">
            {data.leads.map((lead) => {
              const config = statusConfig[lead.status];
              return (
                <li
                  key={lead.id}
                  className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Status dot */}
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      config.dot
                    )}
                  />

                  {/* Lead name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {lead.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {lead.assignee} · {lead.lastActivity}
                    </p>
                  </div>

                  {/* Value */}
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex-shrink-0">
                    {formatCurrency(lead.value, data.currency)}
                  </span>

                  {/* Status badge */}
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                      config.color
                    )}
                  >
                    {config.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
