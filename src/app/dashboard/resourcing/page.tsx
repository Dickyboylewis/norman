"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TopBar } from "@/components/dashboard/topbar";
import { DemandCapacityChart } from "@/components/dashboard/resourcing/demand-capacity-chart";
import { ResourcingView } from "@/components/dashboard/resourcing/resourcing-view";
import fixture from "@/lib/fixtures/resourcing.json";
import type { ResourcingFilterMode } from "@/lib/resourcing-math";
import type { ResourcingData } from "@/lib/resourcing-types";

const FILTER_STORAGE_KEY = "resourcing-filter-mode";

function isFilterMode(v: string | null): v is ResourcingFilterMode {
  return v === "confirmed" || v === "75plus" || v === "all";
}

const INITIAL_DATA = fixture as ResourcingData;

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ResourcingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<ResourcingFilterMode>("75plus");
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(FILTER_STORAGE_KEY);
        if (isFilterMode(stored)) setFilterMode(stored);
      } catch {
        /* storage unavailable */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const changeFilterMode = (mode: ResourcingFilterMode) => {
    setFilterMode(mode);
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, mode);
    } catch {
      /* storage unavailable */
    }
  };

  const { data } = useQuery<ResourcingData>({
    queryKey: ["resourcing"],
    queryFn: async () => {
      const res = await fetch("/api/resourcing");
      if (!res.ok) throw new Error("Failed to load resourcing data");
      return res.json();
    },
    initialData: INITIAL_DATA,
    initialDataUpdatedAt: 0,
  });

  const firstWeek = data.weekStarts[0];

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Resourcing" />

      <div className="flex-1 p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
            Resourcing Look-Ahead
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Roboto, sans-serif" }}>
            Next {data.weekStarts.length} weeks from {firstWeek ? longDate(firstWeek) : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: "Roboto, sans-serif" }}>
            Data snapshot: {longDate(data.generatedAt)}
          </p>
        </div>

        <DemandCapacityChart
          data={data}
          mode={filterMode}
          onModeChange={changeFilterMode}
          onSelectPerson={userId => {
            setSelectedId(userId);
            gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />

        <div ref={gridRef}>
          <ResourcingView
            data={data}
            selectedId={selectedId}
            onSelect={setSelectedId}
            filterMode={filterMode}
          />
        </div>
      </div>
    </div>
  );
}
