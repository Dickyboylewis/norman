import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/xero";

export async function GET() {
  try {
    const { accessToken, tenantId } = await getValidAccessToken();

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const fromDate = sixMonthsAgo.toISOString().split("T")[0];
    const toDate = now.toISOString().split("T")[0];

    const url = `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}&periods=6&timeframe=MONTH`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Xero P&L error:", errText);
      return NextResponse.json({ error: "Failed to fetch from Xero" }, { status: 502 });
    }

    const data = await res.json();
    const report = data.Reports?.[0];
    if (!report) {
      return NextResponse.json({ error: "No report data" }, { status: 502 });
    }

    const allRows = report.Rows || [];

    // Get header row and clean up month labels to just "Oct", "Nov" etc
    const headerRow = allRows.find((r: any) => r.RowType === "Header");
    const rawHeaders: string[] = headerRow?.Cells?.slice(1).map((c: any) => c.Value) || [];
    const headers = rawHeaders.map((h: string) => {
      // Xero returns dates like "21 Mar 26" — extract just the month name
      const parts = h.trim().split(" ");
      return parts.length >= 2 ? parts[1] : h;
    });

    // Log all section titles so we can see what Xero returns
    console.log("P&L sections:", allRows.map((r: any) => `[${r.RowType}] ${r.Title || r.Cells?.[0]?.Value || ""}`));

    // Find the best income and expense rows
    // Strategy: look for SummaryRows and pick the ones with the largest values
    let incomeRow: any = null;
    let expensesRow: any = null;

    for (const section of allRows) {
      if (section.RowType !== "Section") continue;
      const title = (section.Title || "").toLowerCase();

      for (const row of section.Rows || []) {
        if (row.RowType !== "SummaryRow") continue;

        const isIncome = title.includes("income") || title.includes("revenue") || title.includes("trading") || title.includes("sales");
        const isExpense = title.includes("expense") || title.includes("cost") || title.includes("overhead") || title.includes("operating");

        if (isIncome) incomeRow = row;
        if (isExpense) expensesRow = row;
      }
    }

    // Fallback: if we still haven't found them, grab the first and second summary rows
    if (!incomeRow || !expensesRow) {
      const summaryRows = allRows.flatMap((s: any) =>
        (s.Rows || []).filter((r: any) => r.RowType === "SummaryRow")
      );
      if (!incomeRow && summaryRows[0]) incomeRow = summaryRows[0];
      if (!expensesRow && summaryRows[1]) expensesRow = summaryRows[1];
    }

    const months = headers.map((month: string, i: number) => ({
      month,
      cashIn: Math.abs(parseFloat(incomeRow?.Cells?.[i + 1]?.Value || "0")),
      cashOut: Math.abs(parseFloat(expensesRow?.Cells?.[i + 1]?.Value || "0")),
    }));

    const totalCashIn = months.reduce((s, m) => s + m.cashIn, 0);
    const totalCashOut = months.reduce((s, m) => s + m.cashOut, 0);

    return NextResponse.json({
      months,
      totalCashIn,
      totalCashOut,
      difference: totalCashIn - totalCashOut,
      connected: true,
    });

  } catch (error: any) {
    console.error("Cashflow API Error:", error?.message ?? error);
    if (error?.message === "XERO_NOT_CONNECTED" || error?.message === "XERO_NO_TENANT") {
      return NextResponse.json({ error: "Xero not connected" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch cashflow" }, { status: 500 });
  }
}