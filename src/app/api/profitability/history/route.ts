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

interface HistoryCell {
  earnedFee: number;
  cost: number;
  profit: number;
}

interface HistoryProject {
  code: string;
  title: string;
  monthly: Record<string, HistoryCell>;
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
  const monthSet = new Set(months);

  const dir = path.join(process.cwd(), "data", "snapshots");

  let filenames: string[] = [];
  try {
    filenames = fs.readdirSync(dir);
  } catch {
    return NextResponse.json({ success: true, fy, months, snapshotMonths: [], projects: [] });
  }

  const byCode = new Map<string, HistoryProject>();
  const snapshotMonths: string[] = [];

  for (const filename of filenames) {
    const match = filename.match(/^profitability-(\d{4}-\d{2})\.json$/);
    if (!match) continue;
    const month = match[1];
    if (!monthSet.has(month)) continue;

    let snapshot: SnapshotFile;
    try {
      snapshot = JSON.parse(fs.readFileSync(path.join(dir, filename), "utf8"));
      if (!Array.isArray(snapshot.stages)) continue;
    } catch {
      continue;
    }
    snapshotMonths.push(month);

    const titleByCode = new Map<string, string>();
    for (const project of snapshot.projects ?? []) {
      if (project?.Code) titleByCode.set(project.Code, project.Title);
    }

    const monthTotals = new Map<string, HistoryCell>();
    for (const stage of snapshot.stages) {
      if (!stage?.Code) continue;
      let cell = monthTotals.get(stage.Code);
      if (!cell) {
        cell = { earnedFee: 0, cost: 0, profit: 0 };
        monthTotals.set(stage.Code, cell);
      }
      if (stage.StageStatus === "Won") cell.earnedFee += stageEarnedFee(stage);
      cell.cost += stage.Cost ?? 0;
    }

    for (const [code, cell] of monthTotals) {
      let entry = byCode.get(code);
      if (!entry) {
        entry = {
          code,
          title: titleByCode.get(code) ?? snapshot.stages.find(s => s.Code === code)?.Title ?? code,
          monthly: {},
        };
        byCode.set(code, entry);
      }
      entry.monthly[month] = {
        earnedFee: round2(cell.earnedFee),
        cost: round2(cell.cost),
        profit: round2(cell.earnedFee - cell.cost),
      };
    }
  }

  const projects = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  snapshotMonths.sort();

  return NextResponse.json({ success: true, fy, months, snapshotMonths, projects });
}
