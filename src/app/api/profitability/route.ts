import { NextResponse } from "next/server";
import { ConnectionPool } from "mssql";
import fixture from "@/lib/fixtures/profitability.json";
import stagesFixture from "@/lib/fixtures/profitability-stages.json";
import { getProjectColorMap } from "@/lib/project-colors-server";

export const dynamic = "force-dynamic";

async function withColors<P extends { Code: string }, S extends { Code: string }>(
  projects: P[],
  stages: S[],
): Promise<{ projects: (P & { color: string })[]; stages: (S & { color: string })[] }> {
  const colors = await getProjectColorMap([
    ...projects.map((p) => p.Code),
    ...stages.map((s) => s.Code),
  ]);
  return {
    projects: projects.map((p) => ({ ...p, color: colors[p.Code] })),
    stages: stages.map((s) => ({ ...s, color: colors[s.Code] })),
  };
}

const PROJECT_QUERY = `
SELECT
  p.Code,
  p.Title,
  fee.TotalFee,
  ISNULL(inv.TotalInvoiced, 0) AS TotalInvoiced,
  ISNULL(tc.TimeCost, 0) AS TimeCost,
  fee.TotalFee - ISNULL(tc.TimeCost, 0) AS ProfitVsFee,
  CAST(100.0 * (fee.TotalFee - ISNULL(tc.TimeCost, 0)) / NULLIF(fee.TotalFee, 0) AS DECIMAL(5,1)) AS MarginPct
FROM CMAP_Projects p
LEFT JOIN (
  SELECT ProjectID, SUM(OurFee) AS TotalFee
  FROM CMAP_BudgetTasks
  GROUP BY ProjectID
) fee ON fee.ProjectID = p.ProjectID
LEFT JOIN (
  SELECT ProjectID, SUM(Net) AS TotalInvoiced
  FROM CMAP_Invoices
  GROUP BY ProjectID
) inv ON inv.ProjectID = p.ProjectID
LEFT JOIN (
  SELECT t.ProjectID, SUM(t.Hours * r.Cost) AS TimeCost
  FROM CMAP_TimesheetEntries t
  JOIN CMAP_ActualRoleCosts r
    ON t.BudgetRoleID = r.BudgetRoleID
   AND t.Date >= r.Start
   AND t.Date <= COALESCE(r.[End], '2099-12-31')
  GROUP BY t.ProjectID
) tc ON tc.ProjectID = p.ProjectID
WHERE p.StatusID = 'Project'
  AND p.Code LIKE '[0-9]%'
  AND fee.TotalFee > 0
ORDER BY fee.TotalFee DESC;
`;

const STAGE_QUERY = `
WITH StageFee AS (
  SELECT t.ProjectID, t.BudgetStageID,
         SUM(t.OurFee) AS Fee,
         MAX(t.PercentageComplete) AS Pct,
         SUM(t.OurFee * t.PercentageComplete / 100.0) AS EarnedFee
  FROM CMAP_BudgetTasks t
  GROUP BY t.ProjectID, t.BudgetStageID
),
StageCost AS (
  SELECT te.ProjectID, bt.BudgetStageID,
         SUM(te.Hours * COALESCE(te.ActualRate, te.RoleRate, 0)) AS Cost,
         MAX(te.Date) AS LastWorked
  FROM CMAP_TimesheetEntries te
  JOIN CMAP_BudgetTasks bt ON bt.BudgetTaskID = te.BudgetTaskID
  GROUP BY te.ProjectID, bt.BudgetStageID
)
SELECT p.Code,
       p.Title,
       s.Name AS StageName,
       s.StatusID AS StageStatus,
       ISNULL(f.Fee, 0) AS Fee,
       ISNULL(f.Pct, 0) AS Pct,
       ISNULL(f.EarnedFee, 0) AS EarnedFee,
       ISNULL(c.Cost, 0) AS Cost,
       c.LastWorked,
       CASE WHEN s.StatusID = 'Won'
            THEN ISNULL(f.EarnedFee, 0) - ISNULL(c.Cost, 0)
            ELSE -ISNULL(c.Cost, 0)
       END AS StageProfit
FROM CMAP_Projects p
JOIN CMAP_BudgetStages s ON s.ProjectID = p.ProjectID
LEFT JOIN StageFee f ON f.BudgetStageID = s.BudgetStageID
LEFT JOIN StageCost c ON c.ProjectID = p.ProjectID AND c.BudgetStageID = s.BudgetStageID
WHERE p.StatusID = 'Project'
  AND p.Code LIKE '[0-9]%'
  AND (s.StatusID = 'Won' OR ISNULL(c.Cost, 0) > 0)
ORDER BY p.Code, s.Name;
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

export async function GET() {
  try {
    const pool = await getPool();
    const [projects, stages] = await Promise.all([
      pool.request().query(PROJECT_QUERY),
      pool.request().query(STAGE_QUERY),
    ]);
    return NextResponse.json(
      await withColors(
        projects.recordset as { Code: string }[],
        stages.recordset as { Code: string }[],
      ),
      { headers: { "X-Data-Source": "live" } },
    );
  } catch (error) {
    console.error("CMap DRS profitability error:", error);
    return NextResponse.json(
      await withColors(fixture as { Code: string }[], stagesFixture as { Code: string }[]),
      { headers: { "X-Data-Source": "fixture" } },
    );
  }
}
