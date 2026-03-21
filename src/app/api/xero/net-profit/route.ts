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
      return NextResponse.json({ error: "Failed to fetch P&L from Xero" }, { status: 502 });
    }

    const data = await res.json();
    const report = data.Reports?.[0];

    if (!report) {
      return NextResponse.json({ error: "No report data returned" }, { status: 502 });
    }

    // Extract net profit rows from the report
    const months: { month: string; netProfit: number }[] = [];
    let totalNetProfit = 0;

    // Find the "Net Profit" row in the report rows
    const allRows = report.Rows || [];
    let netProfitRow: any = null;

    for (const section of allRows) {
      if (section.RowType === "Section") {
        for (const row of section.Rows || []) {
          if (row.RowType === "SummaryRow" || (row.Cells?.[0]?.Value === "Net Profit")) {
            netProfitRow = row;
          }
        }
      }
      if (section.Cells?.[0]?.Value === "Net Profit") {
        netProfitRow = section;
      }
    }

    // Extract column headers (month names)
    const headerRow = allRows.find((r: any) => r.RowType === "Header");
    const headers = headerRow?.Cells?.slice(1).map((c: any) => c.Value) || [];

    if (netProfitRow) {
      const cells = netProfitRow.Cells?.slice(1) || [];
      cells.forEach((cell: any, i: number) => {
        const value = parseFloat(cell.Value || "0");
        const monthLabel = headers[i] || `Month ${i + 1}`;
        months.push({ month: monthLabel, netProfit: value });
        totalNetProfit += value;
      });
    }

    return NextResponse.json({
      netProfit: totalNetProfit,
      months,
      fromDate,
      toDate,
      connected: true,
    });

  } catch (error: any) {
    console.error("Net Profit API Error:", error?.message ?? error);
    if (error?.message === "XERO_NOT_CONNECTED" || error?.message === "XERO_NO_TENANT") {
      return NextResponse.json({ error: "Xero not connected" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch net profit data" }, { status: 500 });
  }
}