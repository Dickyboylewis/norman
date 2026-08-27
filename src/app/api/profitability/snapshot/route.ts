import { NextResponse } from "next/server";
import { ConnectionPool } from "mssql";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const SNAPSHOT_SECRET = "norman-snapshot-2026";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("secret") !== SNAPSHOT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Invalid month, expected YYYY-MM", success: false },
      { status: 400 },
    );
  }

  try {
    const pool = await getPool();
    const [projects, stages] = await Promise.all([
      pool.request().query(PROJECT_QUERY),
      pool.request().query(STAGE_QUERY),
    ]);

    const payload = {
      snapshotDate: new Date().toISOString(),
      month,
      projectCount: projects.recordset.length,
      projects: projects.recordset,
      stages: stages.recordset,
    };

    const dir = path.join(process.cwd(), "data", "snapshots");
    fs.mkdirSync(dir, { recursive: true });
    const filename = `profitability-${month}.json`;
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(payload, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      month,
      file: `data/snapshots/${filename}`,
      projectCount: payload.projectCount,
    });
  } catch (error) {
    console.error("profitability snapshot error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Snapshot failed",
        success: false,
      },
      { status: 500 },
    );
  }
}
