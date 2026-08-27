import { NextResponse } from "next/server";
import { ConnectionPool } from "mssql";

export const dynamic = "force-dynamic";

// Timesheet cost joins mirror the validated queries in ../route.ts: the
// task join uses bt.BudgetTaskID = t.BudgetTaskID, and project attribution
// comes from t.ProjectID (as in both TimeCost and StageCost there), not from
// walking the stage chain.
const COST_QUERY = `
SELECT p.ProjectID, p.Code, p.Title, p.StatusID,
       FORMAT(t.Date, 'yyyy-MM') AS Month,
       SUM(t.Hours * COALESCE(t.ActualRate, t.RoleRate, 0)) AS Cost
FROM CMAP_TimesheetEntries t
JOIN CMAP_BudgetTasks bt ON bt.BudgetTaskID = t.BudgetTaskID
JOIN CMAP_Projects p ON p.ProjectID = t.ProjectID
WHERE t.Date >= @startDate AND t.Date <= @endDate
  AND p.Code LIKE '[0-9]%'
GROUP BY p.ProjectID, p.Code, p.Title, p.StatusID, FORMAT(t.Date, 'yyyy-MM');
`;

const INVOICE_QUERY = `
SELECT p.ProjectID, p.Code, p.Title, p.StatusID,
       FORMAT(i.Date, 'yyyy-MM') AS Month,
       SUM(i.Net) AS Invoiced
FROM CMAP_Invoices i
JOIN CMAP_Projects p ON i.ProjectID = p.ProjectID
WHERE i.Date >= @startDate AND i.Date <= @endDate
  AND p.Code LIKE '[0-9]%'
GROUP BY p.ProjectID, p.Code, p.Title, p.StatusID, FORMAT(i.Date, 'yyyy-MM');
`;

let poolPromise: Promise<ConnectionPool> | null = null;

function getPool(): Promise<ConnectionPool> {
  if (!poolPromise) {
    const pool = new ConnectionPool({
      server: process.env.CMAP_DRS_SERVER ?? "",
      database: process.env.CMAP_DRS_DATABASE ?? "",
      user: process.env.CMAP_DRS_USER ?? "",
      password: process.env.CMAP_DRS_PASSWORD ?? "",
      port: 1433,
      options: { encrypt: true },
    });
    poolPromise = pool.connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

interface MonthlyQueryRow {
  ProjectID: number | string;
  Code: string;
  Title: string;
  StatusID: string;
  Month: string;
  Cost?: number;
  Invoiced?: number;
}

interface ProjectMonthly {
  projectId: number | string;
  code: string;
  title: string;
  status: string;
  monthly: Record<string, { cost: number; invoiced: number }>;
  totalCost: number;
  totalInvoiced: number;
  net: number;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resolved = resolveFy(searchParams.get("fy"));
  if (!resolved) {
    return NextResponse.json({ error: "Invalid fy parameter" }, { status: 400 });
  }
  const { fy, startYear } = resolved;
  const startDate = `${startYear}-08-01`;
  const endDate = `${startYear + 1}-07-31`;

  try {
    const pool = await getPool();
    const [costs, invoices] = await Promise.all([
      pool
        .request()
        .input("startDate", new Date(Date.UTC(startYear, 7, 1)))
        .input("endDate", new Date(Date.UTC(startYear + 1, 6, 31)))
        .query<MonthlyQueryRow>(COST_QUERY),
      pool
        .request()
        .input("startDate", new Date(Date.UTC(startYear, 7, 1)))
        .input("endDate", new Date(Date.UTC(startYear + 1, 6, 31)))
        .query<MonthlyQueryRow>(INVOICE_QUERY),
    ]);

    const byProject = new Map<string, ProjectMonthly>();

    const entryFor = (row: MonthlyQueryRow): ProjectMonthly => {
      const key = String(row.ProjectID);
      let entry = byProject.get(key);
      if (!entry) {
        entry = {
          projectId: row.ProjectID,
          code: row.Code,
          title: row.Title,
          status: row.StatusID,
          monthly: {},
          totalCost: 0,
          totalInvoiced: 0,
          net: 0,
        };
        byProject.set(key, entry);
      }
      return entry;
    };

    const monthCell = (entry: ProjectMonthly, month: string) => {
      if (!entry.monthly[month]) entry.monthly[month] = { cost: 0, invoiced: 0 };
      return entry.monthly[month];
    };

    for (const row of costs.recordset) {
      const entry = entryFor(row);
      monthCell(entry, row.Month).cost += row.Cost ?? 0;
    }
    for (const row of invoices.recordset) {
      const entry = entryFor(row);
      monthCell(entry, row.Month).invoiced += row.Invoiced ?? 0;
    }

    const projects = [...byProject.values()]
      .map(entry => {
        let totalCost = 0;
        let totalInvoiced = 0;
        for (const month of Object.keys(entry.monthly)) {
          const cell = entry.monthly[month];
          cell.cost = round2(cell.cost);
          cell.invoiced = round2(cell.invoiced);
          totalCost += cell.cost;
          totalInvoiced += cell.invoiced;
        }
        entry.totalCost = round2(totalCost);
        entry.totalInvoiced = round2(totalInvoiced);
        entry.net = round2(entry.totalInvoiced - entry.totalCost);
        return entry;
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({
      success: true,
      fy,
      startDate,
      endDate,
      months: fyMonths(startYear),
      projects,
    });
  } catch (error) {
    console.error("profitability monthly error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Monthly profitability query failed",
        success: false,
      },
      { status: 500 },
    );
  }
}
