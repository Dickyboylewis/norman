import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/xero";

export async function GET() {
  try {
    const { accessToken, tenantId } = await getValidAccessToken();

    const now = new Date();

    // Current period: last 12 months
    const currentFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const currentFromDate = currentFrom.toISOString().split("T")[0];
    const currentToDate = now.toISOString().split("T")[0];

    // Prior period: 12 months before that
    const priorFrom = new Date(now.getFullYear(), now.getMonth() - 23, 1);
    const priorTo = new Date(now.getFullYear(), now.getMonth() - 12, 0);
    const priorFromDate = priorFrom.toISOString().split("T")[0];
    const priorToDate = priorTo.toISOString().split("T")[0];

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    };

    // Fetch current P&L
    const [currentRes, priorRes, cashflowRes] = await Promise.all([
      fetch(
        `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?fromDate=${currentFromDate}&toDate=${currentToDate}`,
        { headers }
      ),
      fetch(
        `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?fromDate=${priorFromDate}&toDate=${priorToDate}`,
        { headers }
      ),
      fetch(
        `https://api.xero.com/api.xro/2.0/Reports/BankSummary?fromDate=${currentFromDate}&toDate=${currentToDate}`,
        { headers }
      ),
    ]);

    function extractSummaryValue(report: any, label: string): number {
      const allRows = report?.Rows || [];
      for (const section of allRows) {
        if (section.RowType === "Section") {
          const title = (section.Title || "").toLowerCase();
          if (label === "income" && (title.includes("income") || title.includes("revenue") || title.includes("trading income") || title.includes("sales"))) {
            for (const row of section.Rows || []) {
              if (row.RowType === "SummaryRow") {
                const val = parseFloat(row.Cells?.[1]?.Value || "0");
                return Math.round(val * 100) / 100;
              }
            }
          }
          if (label === "expenses" && (title.includes("expense") || title.includes("cost") || title.includes("overhead") || title.includes("operating"))) {
            for (const row of section.Rows || []) {
              if (row.RowType === "SummaryRow") {
                const val = parseFloat(row.Cells?.[1]?.Value || "0");
                return Math.round(Math.abs(val) * 100) / 100;
              }
            }
          }
        }
        if (section.Cells?.[0]?.Value === "Net Profit") {
          if (label === "netProfit") {
            const val = parseFloat(section.Cells?.[1]?.Value || "0");
            return Math.round(val * 100) / 100;
          }
        }
      }
      return 0;
    }

    let currentRevenue = 0;
    let currentExpenses = 0;
    let currentNetProfit = 0;
    let priorRevenue = 0;
    let priorExpenses = 0;
    let priorNetProfit = 0;
    let cashflowBalance = 0;

    if (currentRes.ok) {
      const currentData = await currentRes.json();
      const report = currentData.Reports?.[0];
      currentRevenue = extractSummaryValue(report, "income");
      currentExpenses = extractSummaryValue(report, "expenses");
      currentNetProfit = extractSummaryValue(report, "netProfit");
    }

    if (priorRes.ok) {
      const priorData = await priorRes.json();
      const report = priorData.Reports?.[0];
      priorRevenue = extractSummaryValue(report, "income");
      priorExpenses = extractSummaryValue(report, "expenses");
      priorNetProfit = extractSummaryValue(report, "netProfit");
    }

    if (cashflowRes.ok) {
      const cashflowData = await cashflowRes.json();
      const allRows = cashflowData.Reports?.[0]?.Rows || [];
      let totalReceived = 0;
      let totalSpent = 0;
      for (const section of allRows) {
        for (const child of section.Rows || []) {
          if (child.RowType !== "Row") continue;
          const cells = child.Cells || [];
          totalReceived += Math.abs(parseFloat(cells[2]?.Value || "0"));
          totalSpent += Math.abs(parseFloat(cells[3]?.Value || "0"));
        }
      }
      cashflowBalance = Math.round((totalReceived - totalSpent) * 100) / 100;
    }

    function pctChange(current: number, prior: number): string {
      if (prior === 0) return "+0.0%";
      const change = ((current - prior) / Math.abs(prior)) * 100;
      const sign = change >= 0 ? "+" : "";
      return `${sign}${change.toFixed(1)}%`;
    }

    return NextResponse.json({
      totalRevenue: currentRevenue,
      totalExpenses: currentExpenses,
      netProfit: currentNetProfit,
      cashflowBalance,
      revenueChange: pctChange(currentRevenue, priorRevenue),
      expensesChange: pctChange(currentExpenses, priorExpenses),
      netProfitChange: pctChange(currentNetProfit, priorNetProfit),
      cashflowChange: "+0.0%", // cashflow period comparison not available from BankSummary alone
      connected: true,
    });
  } catch (error: any) {
    console.error("Balance Summary API Error:", error?.message ?? error);
    if (error?.message === "XERO_NOT_CONNECTED" || error?.message === "XERO_NO_TENANT") {
      return NextResponse.json({ error: "Xero not connected" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch balance summary" }, { status: 500 });
  }
}
