import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface SnapshotStageRow {
  Code: string;
  Title: string;
  StageName: string;
  StageStatus: string;
  Fee: number;
  Pct: number;
  EarnedFee?: number;
  Cost: number;
  StageProfit: number;
}

interface SnapshotProjectRow {
  Code: string;
  Title: string;
}

interface SnapshotFile {
  snapshotDate: string;
  month: string;
  projectCount: number;
  projects: SnapshotProjectRow[];
  stages: SnapshotStageRow[];
}

interface CumulativeCell {
  earnedFee: number;
  cost: number;
}

interface HistoryEntry {
  cumulative: { earnedFee: number; cost: number; profit: number };
  delta: number | null;
  isBaseline: boolean;
}

interface HistoryProject {
  code: string;
  title: string;
  monthly: Record<string, HistoryEntry>;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function resolveFy(param: string | null): { fy: string; startYear: number } | null {
  if (param === null) {
    const now = new Date();
    const startYear = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    return { fy: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`, startYear };
  }
  if (!/^\d{4}-\d{2}$/.test(param)) return null;
  const startYear = parseInt(param.slice(0, 4), 10);
  const endTwo = parseInt(param.slice(5, 7), 10);
  if (endTwo !== (startYear + 1) % 100) return null;
  return { fy: param, startYear };
}

function fyMonths(startYear: number): string[] {
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (7 + i) % 12;
    const year = startYear + (7 + i >= 12 ? 1 : 0);
    months.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}`);
  }
  return months;
}

function prevCalendarMonth(month: string): string {
  const year = parseInt(month.slice(0, 4), 10);
  const m = parseInt(month.slice(5, 7), 10);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, "0")}`;
}

function stageEarnedFee(stage: SnapshotStageRow): number {
  if (typeof stage.EarnedFee === "number") return stage.EarnedFee;
  return ((stage.Fee ?? 0) * (stage.Pct ?? 0)) / 100;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resolved = resolveFy(searchParams.get("fy"));
  if (!resolved) {
    return NextResponse.json({ error: "Invalid fy parameter" }, { status: 400 });
  }
  const { fy, startYear } = resolved;
  const months = fyMonths(startYear);

  const dir = path.join(process.cwd(), "data", "snapshots");

  let filenames: string[] = [];
  try {
    filenames = fs.readdirSync(dir);
  } catch {
    return NextResponse.json({ success: true, fy, months, snapshotMonths: [], projects: [] });
  }

  // Cumulative life-to-date position per snapshot month, across ALL snapshots
  // on disk — the delta for the first FY month needs the prior FY's last one.
  const cumByMonth = new Map<string, Map<string, CumulativeCell>>();
  const titles = new Map<string, string>();

  for (const filename of filenames) {
    const match = filename.match(/^profitability-(\d{4}-\d{2})\.json$/);
    if (!match) continue;
    const month = match[1];

    let snapshot: SnapshotFile;
    try {
      snapshot = JSON.parse(fs.readFileSync(path.join(dir, filename), "utf8"));
      if (!Array.isArray(snapshot.stages)) continue;
    } catch {
      continue;
    }

    for (const project of snapshot.projects ?? []) {
      if (project?.Code && !titles.has(project.Code)) titles.set(project.Code, project.Title);
    }

    const monthMap = new Map<string, CumulativeCell>();
    for (const stage of snapshot.stages) {
      if (!stage?.Code) continue;
      if (!titles.has(stage.Code) && stage.Title) titles.set(stage.Code, stage.Title);
      let cell = monthMap.get(stage.Code);
      if (!cell) {
        cell = { earnedFee: 0, cost: 0 };
        monthMap.set(stage.Code, cell);
      }
      if (stage.StageStatus === "Won") cell.earnedFee += stageEarnedFee(stage);
      cell.cost += stage.Cost ?? 0;
    }
    cumByMonth.set(month, monthMap);
  }

  const snapshotSet = new Set(cumByMonth.keys());
  const fySnapshotMonths = months.filter(m => snapshotSet.has(m));

  const byCode = new Map<string, HistoryProject>();

  for (const month of fySnapshotMonths) {
    const monthMap = cumByMonth.get(month);
    if (!monthMap) continue;
    const prev = prevCalendarMonth(month);
    const prevMap = snapshotSet.has(prev) ? cumByMonth.get(prev) : undefined;

    for (const [code, cell] of monthMap) {
      const profit = cell.earnedFee - cell.cost;
      const prevCell = prevMap?.get(code);

      let delta: number | null = null;
      let isBaseline = true;
      if (prevMap && prevCell) {
        delta = round2(profit - (prevCell.earnedFee - prevCell.cost));
        isBaseline = false;
      }

      let entry = byCode.get(code);
      if (!entry) {
        entry = { code, title: titles.get(code) ?? code, monthly: {} };
        byCode.set(code, entry);
      }
      entry.monthly[month] = {
        cumulative: {
          earnedFee: round2(cell.earnedFee),
          cost: round2(cell.cost),
          profit: round2(profit),
        },
        delta,
        isBaseline,
      };
    }
  }

  const projects = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));

  return NextResponse.json({
    success: true,
    fy,
    months,
    snapshotMonths: fySnapshotMonths,
    projects,
  });
}
