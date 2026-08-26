"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { TopBar } from "@/components/dashboard/topbar";
import { ProjectImagePicker } from "@/components/dashboard/widgets/project-image-picker";
import projectsFixture from "@/lib/fixtures/profitability.json";
import stagesFixture from "@/lib/fixtures/profitability-stages.json";

interface ProfitabilityRow {
  Code: string;
  Title: string;
  TotalFee: number;
  TotalInvoiced: number;
  TimeCost: number;
  ProfitVsFee: number;
  MarginPct: number | null;
}

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
  projects: ProfitabilityRow[];
  stages: StageRow[];
}

const INITIAL_DATA: ProfitabilityResponse = {
  projects: projectsFixture as ProfitabilityRow[],
  stages: stagesFixture as StageRow[],
};

type RibaStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface StageClass {
  group: "riba" | "support" | "other";
  ribaStage?: RibaStage;
  cleanLabel: string;
}

const RIBA_NUMBER_RULES: RegExp[] = [
  /RIBA Stages? (\d)/i,
  /^Stages? (\d)/i,
  /^(\d)\s*[-–]/,
  /Stages? (\d)/i,
  /\b(\d)\s*[-–&]\s*\d\b/,
];

function stripStagePrefix(name: string): string {
  const stripped = name
    .replace(/^(?:RIBA\s+)?Stages?\s*\d+(?:\s*[-–&]\s*\d+)?\s*[-–—:]\s*/i, "")
    .replace(/^\d+\s*[-–—]\s*/, "")
    .trim();
  return stripped.length ? stripped : name;
}

function classifyStage(name: string): StageClass {
  const original = name.trim();
  const n = name.replace(/\s+/g, " ").trim();
  if (/BRPD|BR PD|CDM|Principal Designer/i.test(n)) {
    return { group: "support", cleanLabel: original };
  }
  let num: number | null = null;
  for (const rule of RIBA_NUMBER_RULES) {
    const match = n.match(rule);
    if (match) {
      const digit = parseInt(match[1], 10);
      if (digit >= 0 && digit <= 7) {
        num = digit;
        break;
      }
    }
  }
  if (num === null && /Pitch|^Bid$|^BID$|^0\b|Feasibility/i.test(n)) {
    num = 0;
  }
  if (num === null) {
    const match = n.match(/\b([0-7])\b/);
    if (match) num = parseInt(match[1], 10);
  }
  if (num !== null) {
    return { group: "riba", ribaStage: num as RibaStage, cleanLabel: stripStagePrefix(original) };
  }
  return { group: "other", cleanLabel: original };
}

function formatGBP(n: number): string {
  return "£" + Math.round(n).toLocaleString("en-GB");
}

function threeSigFigs(v: number): string {
  const digits = Math.max(0, 3 - Math.floor(Math.log10(v)) - 1);
  return v.toFixed(digits);
}

function formatGBPShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return "£" + threeSigFigs(abs / 1_000_000) + "m";
  if (abs >= 1_000) return "£" + threeSigFigs(abs / 1_000) + "k";
  return "£" + Math.round(abs).toLocaleString("en-GB");
}

function formatSignedGBPShort(n: number): string {
  return (n < 0 ? "-" : "+") + formatGBPShort(n);
}

function getInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  const first = words[0]?.[0]?.toUpperCase() ?? "";
  const second = words[1]?.[0]?.toUpperCase() ?? "";
  return first + second;
}

const GREEN_STEPS = [
  "bg-green-300 text-green-900",
  "bg-green-500 text-white",
  "bg-green-600 text-white",
  "bg-green-700 text-white",
];
const AMBER_STEPS = [
  "bg-amber-300 text-amber-900",
  "bg-amber-500 text-white",
  "bg-amber-600 text-white",
  "bg-amber-700 text-white",
];
const RED_STEPS = [
  "bg-red-300 text-red-900",
  "bg-red-500 text-white",
  "bg-red-600 text-white",
  "bg-red-700 text-white",
];
const GREY_CHIP = "bg-gray-200 text-gray-700";

function moneyChipClass(marginPct: number | null, pounds: number): string {
  if (marginPct === null || !Number.isFinite(marginPct)) return GREY_CHIP;
  const family = marginPct >= 20 ? GREEN_STEPS : marginPct >= 0 ? AMBER_STEPS : RED_STEPS;
  const intensity = Math.min(1, Math.max(0.25, Math.log10(Math.max(1, Math.abs(pounds))) / 6));
  const step = intensity < 0.6 ? 0 : intensity < 0.75 ? 1 : intensity < 0.88 ? 2 : 3;
  return family[step];
}

function stageMargin(stage: StageRow): number | null {
  if (stage.Fee > 0) return (100 * stage.StageProfit) / stage.Fee;
  if (stage.StageProfit < 0) return -1;
  return null;
}

function sumMargin(feeSum: number, profitSum: number): number | null {
  if (feeSum > 0) return (100 * profitSum) / feeSum;
  if (profitSum < 0) return -1;
  return null;
}

function truncateLabel(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? trimmed.slice(0, max - 1).trimEnd() + "…" : trimmed;
}

function byLastWorkedDesc(a: StageRow, b: StageRow): number {
  if (a.LastWorked && b.LastWorked) return a.LastWorked < b.LastWorked ? 1 : -1;
  if (a.LastWorked) return -1;
  if (b.LastWorked) return 1;
  return a.StageName.localeCompare(b.StageName);
}

interface ProjectView {
  row: ProfitabilityRow;
  stages: StageRow[];
  wonFee: number;
  honestProfit: number;
  honestMargin: number | null;
  currentStage: StageRow | null;
}

function buildView(row: ProfitabilityRow, stages: StageRow[]): ProjectView {
  const wonStages = stages.filter(s => s.StageStatus === "Won");
  const wonFee = stages.length ? wonStages.reduce((sum, s) => sum + s.Fee, 0) : row.TotalFee;
  const honestProfit = stages.length
    ? stages.reduce((sum, s) => sum + s.StageProfit, 0)
    : row.ProfitVsFee;
  const wonEarnedFee = wonStages.reduce((sum, s) => sum + s.EarnedFee, 0);
  const honestMargin = stages.length
    ? wonEarnedFee > 0
      ? (100 * honestProfit) / wonEarnedFee
      : null
    : row.MarginPct;
  let currentStage: StageRow | null = null;
  for (const s of stages) {
    if (!s.LastWorked) continue;
    if (!currentStage || !currentStage.LastWorked || s.LastWorked > currentStage.LastWorked) {
      currentStage = s;
    }
  }
  return { row, stages, wonFee, honestProfit, honestMargin, currentStage };
}

const STAGE_GRID = "md:grid md:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_6.5rem_5.5rem] md:items-center md:gap-2";

interface ClassifiedStage {
  stage: StageRow;
  label: string;
}

function StageListRow({ item, quiet = false }: { item: ClassifiedStage; quiet?: boolean }) {
  const { stage, label } = item;
  const chip = moneyChipClass(stageMargin(stage), stage.StageProfit);
  return (
    <div className={`flex flex-col gap-1 py-1.5 border-t border-[#DA2C26]/10 first:border-t-0 ${STAGE_GRID}`}>
      <div className="min-w-0 flex items-center gap-2">
        <p
          className={`${quiet ? "text-xs" : "text-sm"} font-medium text-gray-900 truncate`}
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          {label}
        </p>
        {stage.StageStatus !== "Won" && (
          <span className="flex-shrink-0 rounded-full bg-gray-200 text-gray-600 px-2 py-0.5 text-[10px] font-medium">
            Potential
          </span>
        )}
      </div>
      <p className="md:hidden text-xs text-gray-600 whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
        Fee {formatGBPShort(stage.Fee)} · Cost {formatGBPShort(stage.Cost)} ·{" "}
        {stage.Pct >= 100 ? "100%" : `${Math.round(stage.Pct)}% in progress`}
      </p>
      <p className="hidden md:block text-xs text-gray-600 text-right tabular-nums whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
        {formatGBPShort(stage.Fee)}
      </p>
      <p className="hidden md:block text-xs text-gray-600 text-right tabular-nums whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
        {formatGBPShort(stage.Cost)}
      </p>
      <p className="hidden md:block text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
        {stage.Pct >= 100 ? "100%" : `${Math.round(stage.Pct)}% in progress`}
      </p>
      <span
        className={`justify-self-start md:justify-self-end self-start md:self-auto rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap tabular-nums ${chip}`}
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {formatSignedGBPShort(stage.StageProfit)}
      </span>
    </div>
  );
}

function SectionHeader({ title, items }: { title: string; items: ClassifiedStage[] | null }) {
  const chip = useMemo(() => {
    if (!items || items.length < 2) return null;
    const feeSum = items.reduce((sum, i) => sum + i.stage.Fee, 0);
    const profitSum = items.reduce((sum, i) => sum + i.stage.StageProfit, 0);
    return { text: formatSignedGBPShort(profitSum), cls: moneyChipClass(sumMargin(feeSum, profitSum), profitSum) };
  }, [items]);
  return (
    <div className="flex items-center gap-2 mt-3 mb-0.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 font-semibold" style={{ fontFamily: "Poppins, sans-serif" }}>
        {title}
      </p>
      {chip && (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${chip.cls}`}>
          {chip.text}
        </span>
      )}
    </div>
  );
}

function ExpandedStages({ stages }: { stages: StageRow[] }) {
  const { ribaGroups, other, support, supportSummary } = useMemo(() => {
    const riba = new Map<number, ClassifiedStage[]>();
    const other: ClassifiedStage[] = [];
    const support: ClassifiedStage[] = [];
    for (const stage of [...stages].sort(byLastWorkedDesc)) {
      const cls = classifyStage(stage.StageName);
      const item = { stage, label: cls.cleanLabel };
      if (cls.group === "riba" && cls.ribaStage !== undefined) {
        const list = riba.get(cls.ribaStage);
        if (list) list.push(item);
        else riba.set(cls.ribaStage, [item]);
      } else if (cls.group === "support") {
        support.push(item);
      } else {
        other.push(item);
      }
    }
    const ribaGroups = [...riba.entries()].sort((a, b) => b[0] - a[0]);
    const feeSum = support.reduce((sum, i) => sum + i.stage.Fee, 0);
    const profitSum = support.reduce((sum, i) => sum + i.stage.StageProfit, 0);
    const supportSummary = support.length
      ? { text: formatSignedGBPShort(profitSum), cls: moneyChipClass(sumMargin(feeSum, profitSum), profitSum) }
      : null;
    return { ribaGroups, other, support, supportSummary };
  }, [stages]);

  return (
    <>
      <div className={`hidden ${STAGE_GRID} mt-2`}>
        <span />
        <p className="text-[10px] uppercase tracking-[0.1em] text-gray-400 text-right">Fee</p>
        <p className="text-[10px] uppercase tracking-[0.1em] text-gray-400 text-right">Cost</p>
        <span />
        <p className="text-[10px] uppercase tracking-[0.1em] text-gray-400 text-right">Profit</p>
      </div>

      {ribaGroups.map(([stageNo, items]) => (
        <div key={`riba-${stageNo}`}>
          <SectionHeader title={stageNo === 0 ? "Pitch / Feasibility" : `RIBA ${stageNo}`} items={items} />
          {items.map((item, i) => (
            <StageListRow key={`${item.stage.StageName}-${i}`} item={item} />
          ))}
        </div>
      ))}

      {other.length > 0 && (
        <div>
          <SectionHeader title="Other work" items={other} />
          {other.map((item, i) => (
            <StageListRow key={`other-${item.stage.StageName}-${i}`} item={item} />
          ))}
        </div>
      )}

      {support.length > 0 && (
        <div className="mt-3 rounded-xl bg-gray-100 px-2.5 py-2">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500 font-semibold" style={{ fontFamily: "Poppins, sans-serif" }}>
              Support services (BRPD · CDM)
            </p>
            {supportSummary && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${supportSummary.cls}`}>
                {supportSummary.text}
              </span>
            )}
          </div>
          {support.map((item, i) => (
            <StageListRow key={`support-${item.stage.StageName}-${i}`} item={item} quiet />
          ))}
        </div>
      )}
    </>
  );
}

function ProjectCard({ view, imageUrl }: { view: ProjectView; imageUrl: string | null }) {
  const { row, stages, wonFee, honestProfit, honestMargin, currentStage } = view;
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const remaining = currentStage && currentStage.Fee > 0 ? currentStage.Fee - currentStage.Cost : null;
  const chipClass = moneyChipClass(honestMargin, honestProfit);

  return (
    <>
      <div className="flex items-start md:items-center gap-3 md:gap-4 max-w-full">
        <button
          className="w-10 h-10 md:w-20 md:h-20 flex-shrink-0 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#DA2C26]"
          onClick={e => {
            e.stopPropagation();
            setPickerOpen(true);
          }}
          aria-label={`Update image for ${row.Title}`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={row.Title} className="h-full w-full object-cover" />
          ) : (
            <span className="font-semibold text-xs md:text-lg text-gray-500" style={{ fontFamily: "Poppins, sans-serif" }}>
              {getInitials(row.Title)}
            </span>
          )}
        </button>

        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => setExpanded(prev => !prev)}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded(prev => !prev);
            }
          }}
          className={`flex-1 min-w-0 border-2 border-[#DA2C26] bg-[#FDF2F2] px-3 py-2 md:px-5 md:py-3 cursor-pointer transition-all duration-300 ${expanded ? "rounded-3xl" : "rounded-full"}`}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex-shrink min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate" style={{ fontFamily: "Poppins, sans-serif" }}>
                <span className="hidden md:inline">Project {row.Code} · </span>
                {row.Title}
              </p>
              <p className="hidden md:block text-xs text-gray-600 truncate" style={{ fontFamily: "Roboto, sans-serif" }}>
                Won fee {formatGBP(wonFee)}
              </p>
            </div>

            {currentStage && (
              <span className="hidden lg:inline-flex items-center gap-2 flex-shrink-0 rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: "Roboto, sans-serif" }}>
                <span>Now: {truncateLabel(currentStage.StageName, 28)}</span>
                {remaining !== null && remaining > 0 && (
                  <span className="font-semibold text-gray-900">{formatGBPShort(remaining)} to play for</span>
                )}
              </span>
            )}

            <div className="flex-1" />

            <span className={`flex-shrink-0 rounded-full px-2.5 py-1 md:px-4 md:py-1.5 text-xs md:text-sm font-bold whitespace-nowrap ${chipClass}`} style={{ fontFamily: "Poppins, sans-serif" }}>
              <span className="hidden md:inline">Project profit </span>
              {formatSignedGBPShort(honestProfit)}
            </span>

            <span className={`flex-shrink-0 rounded-full px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-bold whitespace-nowrap ${chipClass}`} style={{ fontFamily: "Poppins, sans-serif" }}>
              {honestMargin === null ? "n/a" : `${honestMargin >= 0 ? "+" : ""}${honestMargin.toFixed(1)}%`}
            </span>

            <ChevronDown
              className={`hidden md:block w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            />
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-[#DA2C26]/20">
              <p className="text-xs text-gray-600" style={{ fontFamily: "Roboto, sans-serif" }}>
                Invoiced {formatGBP(row.TotalInvoiced)} · Total cost {formatGBP(row.TimeCost)}
              </p>
              {stages.length ? (
                <ExpandedStages stages={stages} />
              ) : (
                <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: "Roboto, sans-serif" }}>
                  No stage data for this project
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <ProjectImagePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        code={row.Code}
        title={row.Title}
        currentUrl={imageUrl}
      />
    </>
  );
}

export default function ProjectsPage() {
  const { data } = useQuery<ProfitabilityResponse>({
    queryKey: ["profitability"],
    queryFn: async () => {
      const res = await fetch("/api/profitability");
      if (!res.ok) throw new Error("Failed to load profitability data");
      return res.json();
    },
    initialData: INITIAL_DATA,
    initialDataUpdatedAt: 0,
    staleTime: 4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: images } = useQuery<Record<string, string>>({
    queryKey: ["project-images"],
    queryFn: async () => {
      const res = await fetch("/api/project-images");
      if (!res.ok) throw new Error("Failed to load project images");
      return res.json();
    },
  });

  const views = useMemo(() => {
    const stagesByCode = new Map<string, StageRow[]>();
    for (const stage of data.stages) {
      const list = stagesByCode.get(stage.Code);
      if (list) list.push(stage);
      else stagesByCode.set(stage.Code, [stage]);
    }
    return [...data.projects]
      .sort((a, b) => b.TotalFee - a.TotalFee)
      .map(row => buildView(row, stagesByCode.get(row.Code) ?? []));
  }, [data]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Projects" />

      <div className="flex-1 p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
            Live Projects
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Roboto, sans-serif" }}>
            Click any project to see the full breakdown
          </p>
          <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: "Roboto, sans-serif" }}>
            Live from CMap DRS · refreshed every 5 min
          </p>
        </div>

        <div className="space-y-3 md:space-y-4">
          {views.map(view => (
            <ProjectCard key={view.row.Code} view={view} imageUrl={images?.[view.row.Code] ?? null} />
          ))}
        </div>
      </div>
    </div>
  );
}
