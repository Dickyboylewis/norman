import { NextResponse } from "next/server";
import { ConnectionPool } from "mssql";
import fixture from "@/lib/fixtures/invoice-forecast.json";

export const dynamic = "force-dynamic";

const FORECAST_QUERY = `
SELECT
  pr.Code AS projectCode,
  pr.Title AS projectTitle,
  prob.Value AS probability,
  FORMAT(ip.Date, 'yyyy-MM') AS month,
  SUM(ip.Amount) AS fee
FROM CMAP_InvoiceParts ip
JOIN CMAP_Projects pr ON ip.ProjectID = pr.ProjectID
JOIN CMAP_BudgetStages bs ON ip.EntityID = bs.BudgetStageID
JOIN CMAP_Probabilities prob ON bs.ProbabilityID = prob.ProbabilityID
WHERE ip.EntityTypeID = 'BudgetSection'
  AND ip.InvoiceID IS NULL
  AND ip.CreditedToInvoiceID IS NULL
  AND prob.Value IN (75, 100)
  AND pr.StatusID = 'Project'
  AND pr.Code LIKE '[0-9]%'
  AND ip.Date >= @startOfCurrentMonth
GROUP BY pr.Code, pr.Title, prob.Value, FORMAT(ip.Date, 'yyyy-MM')
HAVING SUM(ip.Amount) <> 0
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
