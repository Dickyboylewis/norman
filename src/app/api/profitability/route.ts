import { NextResponse } from "next/server";
import { ConnectionPool } from "mssql";
import fixture from "@/lib/fixtures/profitability.json";

export const dynamic = "force-dynamic";

const QUERY = `
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
    const result = await pool.request().query(QUERY);
    return NextResponse.json(result.recordset, {
      headers: { "X-Data-Source": "live" },
    });
  } catch (error) {
    console.error("CMap DRS profitability error:", error);
    return NextResponse.json(fixture, {
      headers: { "X-Data-Source": "fixture" },
    });
  }
}
