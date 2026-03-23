import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/xero";

export async function GET() {
  try {
    const { accessToken, tenantId } = await getValidAccessToken();

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const fromDate = twelveMonthsAgo.toISOString().split("T")[0];
    const toDate = now.toISOString().split("T")[0];

    const url = `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}&periods=12&timeframe=MONTH`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Xero income-expenses error:", errText);
      return NextResponse.json({ error: "Failed to fetch data from Xero" }, { status: 502 });
    }

    const data = await res.json();
    const report = data.Reports?.[0];

    if (!report) {
      return NextResponse.json({ error: "No report data returned" }, { status: 502 });
    }

    const allRows = report.Rows || [];

    // Extract column headers (month names)
    const headerRow = allRows.find((r: any) => r.RowType === "Header");
    const headers: string[] = headerRow?.Cells?.slice(1).map((c: any) => c.Value) || [];

    let incomeValues: number[] = headers.map(() => 0);
    let expenseValues: number[] = headers.map(() => 0);

    for (const section of allRows) {
      if (section.RowType === "Section") {
        const title = (section.Title || "").toLowerCase();
        if (
          title.includes("income") ||
          title.includes("revenue") ||
          title.includes("trading income") ||
          title.includes("sales")
        ) {
          for (const row of section.Rows || []) {
            if (row.RowType === "SummaryRow") {
              incomeValues = row.Cells?.slice(1).map((c: any) => parseFloat(c.Value || "0")) || incomeValues;
            }
          }
        }
        if (
          title.includes("expense") ||
          title.includes("cost") ||
          title.includes("overhead") ||
          title.includes("operating")
        ) {
          for (const row of section.Rows || []) {
            if (row.RowType === "SummaryRow") {
              expenseValues = row.Cells?.slice(1).map((c: any) => Math.abs(parseFloat(c.Value || "0"))) || expenseValues;
            }
          }
        }
      }
    }

    const months = headers.map((month, i) => ({
      month,
      income: Math.round((incomeValues[i] || 0) * 100) / 100,
      expenses: Math.round((expenseValues[i] || 0) * 100) / 100,
    }));

    const avgIncome =
      months.length > 0
        ? Math.round((months.reduce((s, m) => s + m.income, 0) / months.length) * 100) / 100
        : 0;
    const avgExpenses =
      months.length > 0
        ? Math.round((months.reduce((s, m) => s + m.expenses, 0) / months.length) * 100) / 100
        : 0;

    const latestMonth = headers[headers.length - 1] || "";

    return NextResponse.json({
      months,
      avgIncome,
      avgExpenses,
      latestMonth,
      fromDate,
      toDate,
      connected: true,
    });
  } catch (error: any) {
    console.error("Income-Expenses API Error:", error?.message ?? error);
    if (error?.message === "XERO_NOT_CONNECTED" || error?.message === "XERO_NO_TENANT") {
      return NextResponse.json({ error: "Xero not connected" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch income/expenses data" }, { status: 500 });
  }
}
