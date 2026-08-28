import { NextResponse } from "next/server";
import { ConnectionPool } from "mssql";

export const dynamic = "force-dynamic";

// No person/user column on CMAP_TimesheetEntries is referenced anywhere in
// this codebase (only ProjectID, BudgetTaskID, BudgetRoleID, Hours, Date,
// ActualRate, RoleRate), so rates are grouped by effective rate alone.
// The project join and Code filter mirror the monthly cost query so the
// population matches the cost numbers being inspected.
const RATES_QUERY = `
SELECT COALESCE(t.ActualRate, t.RoleRate, 0) AS Rate,
       SUM(t.Hours) AS Hours,
       COUNT(*) AS Entries,
       SUM(t.Hours * COALESCE(t.ActualRate, t.RoleRate, 0)) AS CostAtRate
FROM CMAP_TimesheetEntries t
JOIN CMAP_Projects p ON p.ProjectID = t.ProjectID
WHERE t.Date >= @startDate AND t.Date <= @endDate
  AND p.Code LIKE '[0-9]%'
GROUP BY COALESCE(t.ActualRate, t.RoleRate, 0)
ORDER BY SUM(t.Hours) DESC;
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

interface RateQueryRow {
  Rate: number;
  Hours: number;
  Entries: number;
  CostAtRate: number;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resolved = resolveFy(searchParams.get("fy"));
  if (!resolved) {
    return NextResponse.json({ error: "Invalid fy parameter" }, { status: 400 });
  }
  const { fy, startYear } = resolved;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("startDate", new Date(Date.UTC(startYear, 7, 1)))
      .input("endDate", new Date(Date.UTC(startYear + 1, 6, 31)))
      .query<RateQueryRow>(RATES_QUERY);

    const rows = result.recordset.map(row => ({
      rate: round2(row.Rate ?? 0),
      hours: round2(row.Hours ?? 0),
      entries: row.Entries ?? 0,
      costAtRate: round2(row.CostAtRate ?? 0),
    }));

    const totalHours = round2(rows.reduce((sum, r) => sum + r.hours, 0));
    const totalCost = round2(rows.reduce((sum, r) => sum + r.costAtRate, 0));
    const weightedAvgRate = totalHours > 0 ? round2(totalCost / totalHours) : 0;

    return NextResponse.json({
      success: true,
      fy,
      groupedBy: "rate" as const,
      rows,
      summary: { totalHours, totalCost, weightedAvgRate },
    });
  } catch (error) {
    console.error("profitability rates error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Rates query failed",
        success: false,
      },
      { status: 500 },
    );
  }
}
