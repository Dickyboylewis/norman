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
      console.error("Xero P&L error:", errText);
      return NextResponse.json({ error: "Failed to fetch P&L from Xero" }, { status: 502 });
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

    // Helper to extract row values
    function extractRowValues(label: string): number[] {
      for (const section of allRows) {
        if (section.RowType === "Section") {
          for (const row of section.Rows || []) {
            if (row.Cells?.[0]?.Value === label) {
              return row.Cells.slice(1).map((c: any) => parseFloat(c.Value || "0"));
            }
          }
          // Check summary rows
          for (const row of section.Rows || []) {
            if (row.RowType === "SummaryRow" && row.Cells?.[0]?.Value === label) {
              return row.Cells.slice(1).map((c: any) => parseFloat(c.Value || "0"));
            }
          }
        }
        if (section.Cells?.[0]?.Value === label) {
          return section.Cells.slice(1).map((c: any) => parseFloat(c.Value || "0"));
        }
      }
      return headers.map(() => 0);
    }

    // Find income total row
    let incomeValues: number[] = [];
    let expenseValues: number[] = [];
    let netProfitValues: number[] = [];

    for (const section of allRows) {
      if (section.RowType === "Section") {
        const title = section.Title || "";
        if (title.toLowerCase().includes("income") || title.toLowerCase().includes("revenue") || title.toLowerCase().includes("trading income")) {
          for (const row of section.Rows || []) {
            if (row.RowType === "SummaryRow") {
              incomeValues = row.Cells?.slice(1).map((c: any) => parseFloat(c.Value || "0")) || [];
            }
          }
        }
        if (title.toLowerCase().includes("expense") || title.toLowerCase().includes("cost") || title.toLowerCase().includes("overhead")) {
          for (const row of section.Rows || []) {
            if (row.RowType === "SummaryRow") {
              expenseValues = row.Cells?.slice(1).map((c: any) => parseFloat(c.Value || "0")) || [];
            }
          }
        }
      }
      // Net profit row
      if (section.Cells?.[0]?.Value === "Net Profit") {
        netProfitValues = section.Cells.slice(1).map((c: any) => parseFloat(c.Value || "0"));
      }
    }

    // Fallback: try to find net profit in summary rows
    if (netProfitValues.length === 0) {
      netProfitValues = extractRowValues("Net Profit");
    }

    const months = headers.map((month, i) => ({
      month,
      revenue: Math.round((incomeValues[i] || 0) * 100) / 100,
      costs: Math.round(Math.abs(expenseValues[i] || 0) * 100) / 100,
      netProfit: Math.round((netProfitValues[i] || 0) * 100) / 100,
    }));

    return NextResponse.json({
      months,
      fromDate,
      toDate,
      connected: true,
    });
  } catch (error: any) {
    console.error("Profit and Loss API Error:", error?.message ?? error);
    if (error?.message === "XERO_NOT_CONNECTED" || error?.message === "XERO_NO_TENANT") {
      return NextResponse.json({ error: "Xero not connected" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch profit and loss data" }, { status: 500 });
  }
}
