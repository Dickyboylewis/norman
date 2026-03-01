"use client";

/**
 * Notion Action Items & Notes Widget
 *
 * Fetches data from /api/notion using TanStack Query and displays:
 * - Summary stats (total items, open action items)
 * - A list of recent notes/action items with type, priority, and tags
 *
 * To connect real data: update /api/notion/route.ts with your API calls.
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
import { FileText, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotionData, NoteType, NotePriority } from "@/app/api/notion/route";

// ─── Data Fetcher ──────────────────────────────────────────────────────────────

async function fetchNotionData(): Promise<NotionData> {
  const res = await fetch("/api/notion");
  if (!res.ok) throw new Error("Failed to fetch Notion data");
  return res.json();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const typeConfig: Record<NoteType, { color: string; label: string }> = {
  "Action Item": {
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    label: "Action",
  },
  Note: {
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    label: "Note",
  },
  Decision: {
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    label: "Decision",
  },
  Meeting: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    label: "Meeting",
  },
};

const priorityConfig: Record<NotePriority, { dot: string; label: string }> = {
  High: { dot: "bg-red-400", label: "High" },
  Medium: { dot: "bg-amber-400", label: "Med" },
  Low: { dot: "bg-slate-300", label: "Low" },
};

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function NotionWidget() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notion"],
    queryFn: fetchNotionData,
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
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
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
          <p className="text-sm text-slate-500">Failed to load Notion data</p>
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

  const openItems = data.notes.filter((n) => !n.completed);
  const completedItems = data.notes.filter((n) => n.completed);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Notion dark accent */}
            <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Action Items</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Notion · {data.databaseName}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {data.actionItems} Open
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data.totalItems}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Total Items</p>
          </div>
          <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 p-3 border border-orange-100 dark:border-orange-900/50">
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {data.actionItems}
            </p>
            <p className="text-xs text-orange-500 mt-0.5">Open Actions</p>
          </div>
        </div>

        {/* Notes List */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
            Recent Items
          </p>
          <ul className="space-y-1.5">
            {data.notes.map((note) => {
              const type = typeConfig[note.type];
              const priority = priorityConfig[note.priority];

              return (
                <li
                  key={note.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-2.5 transition-colors",
                    note.completed
                      ? "opacity-50"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  {/* Completion icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {note.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug",
                        note.completed && "line-through"
                      )}
                    >
                      {note.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* Type badge */}
                      <span
                        className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          type.color
                        )}
                      >
                        {type.label}
                      </span>

                      {/* Priority dot */}
                      <div className="flex items-center gap-1">
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            priority.dot
                          )}
                        />
                        <span className="text-xs text-slate-400">
                          {priority.label}
                        </span>
                      </div>

                      {/* Tags */}
                      {note.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-slate-400 dark:text-slate-500"
                        >
                          #{tag}
                        </span>
                      ))}

                      {/* Date */}
                      <span className="text-xs text-slate-400 ml-auto">
                        {formatRelativeDate(note.lastEdited)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
