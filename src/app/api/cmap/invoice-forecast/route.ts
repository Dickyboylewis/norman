import { NextResponse } from "next/server";
import { ConnectionPool } from "mssql";
import fixture from "@/lib/fixtures/invoice-forecast.json";

export const dynamic = "force-dynamic";

const FORECAST_QUERY = `
SELECT
  pr.Code AS projectCode,
  pr.Title AS projectTitle,
  prob.Value AS probability,
  FORMAT(bt.StartDate, 'yyyy-MM') AS month,
  SUM(bt.OurFee) AS fee
FROM CMAP_BudgetTasks bt
JOIN CMAP_BudgetStages bs ON bt.BudgetStageID = bs.BudgetStageID
JOIN CMAP_Probabilities prob ON bs.ProbabilityID = prob.ProbabilityID
JOIN CMAP_Projects pr ON bs.ProjectID = pr.ProjectID
WHERE pr.StatusID = 'Project'
  AND pr.Code LIKE '[0-9]%'
  AND bs.IsClosed = 0
  AND prob.Value IN (75, 100)
  AND bt.OurFee > 0
  AND bt.StartDate >= @startOfCurrentMonth
GROUP BY pr.Code, pr.Title, prob.Value, FORMAT(bt.StartDate, 'yyyy-MM')
ORDER BY month, probability DESC, fee DESC;
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
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const result = await pool
      .request()
      .input("startOfCurrentMonth", startOfCurrentMonth)
      .query(FORECAST_QUERY);
    return NextResponse.json(
      { data: result.recordset },
      { headers: { "X-Data-Source": "live" } },
    );
  } catch (error) {
    console.error("CMap DRS invoice forecast error:", error);
    return NextResponse.json(
      { data: fixture },
      { headers: { "X-Data-Source": "fixture" } },
    );
  }
}
