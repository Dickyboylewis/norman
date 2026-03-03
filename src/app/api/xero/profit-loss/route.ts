/**
 * Xero Profit & Loss API Route
 *
 * Fetches the Profit and Loss report from Xero for the last 6 months
 * and returns the net profit total.
 *
 * Response shape:
 *   {
 *     netProfit: number,
 *     months: { month: string, netProfit: number }[],
 *     fromDate: string,
 *     toDate: string,
 *     connected: boolean
 *   }
 */

import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/xero";

export async function GET() {
  try {
    const { accessToken, tenantId } = await getValidAccessToken();

    // Calculate date range: last 6 complete months
    const now = new Date();
    const toDate = new Date(now.getFullYear(), now.getMonth(), 0); // last day of previous month
    const fromDate = new Date(toDate.getFullYear(), toDate.getMonth() - 5, 1); // 1st of 6 months ago

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const params = new URLSearchParams({
      fromDate: formatDate(fromDate),
      toDate: formatDate(toDate),
      periods: "5", // 5 additional periods = 6 total columns
      timeframe: "MONTH",
    });

    const url = `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?${params}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-Tenant-Id": tenantId,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Xero P&L API error (${res.status}):`, body);
      return NextResponse.json(
        { error: "Failed to fetch Xero Profit & Loss data" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const report = data.Reports?.[0];

    if (!report) {
      return NextResponse.json(
        { error: "No report data returned from Xero" },
        { status: 502 }
      );
    }

    // Parse the Xero report structure to extract net profit per month
    // Xero P&L reports have rows with RowType: "Section" and a
    // final row with RowType: "Row" titled "Net Profit" (or "Net Loss")
    const headerRow = report.Rows?.find(
      (r: any) => r.RowType === "Header"
    );
    const monthHeaders: string[] =
      headerRow?.Cells?.slice(1).map((c: any) => c.Value) ?? [];

    // Find the Net Profit row — it's usually the last Section or a summary Row
    let netProfitCells: any[] | null = null;

    for (const row of report.Rows ?? []) {
      if (row.RowType === "Section" && row.Title === "Net Profit") {
        // Some Xero orgs nest it as a section with a single row inside
        netProfitCells = row.Rows?.[0]?.Cells ?? null;
      }
      if (row.RowType === "Row") {
        const title = row.Cells?.[0]?.Value ?? "";
        if (/net\s*profit|net\s*loss/i.test(title)) {
          netProfitCells = row.Cells;
        }
      }
    }

    // Also check the very last row which is often the summary
    const lastRow = report.Rows?.[report.Rows.length - 1];
    if (!netProfitCells && lastRow?.RowType === "Row") {
      netProfitCells = lastRow.Cells;
    }

    const months: { month: string; netProfit: number }[] = [];
    let totalNetProfit = 0;

    if (netProfitCells) {
      // First cell is the label, remaining are month values
      for (let i = 1; i < netProfitCells.length; i++) {
        const value = parseFloat(netProfitCells[i]?.Value ?? "0");
        months.push({
          month: monthHeaders[i - 1] ?? `Month ${i}`,
          netProfit: value,
        });
        totalNetProfit += value;
      }
    }

    return NextResponse.json({
      netProfit: totalNetProfit,
      months,
      fromDate: formatDate(fromDate),
      toDate: formatDate(toDate),
      connected: true,
    });
  } catch (error: any) {
    if (error?.message === "XERO_NOT_CONNECTED") {
      return NextResponse.json(
        { error: "Xero not connected", connected: false },
        { status: 401 }
      );
    }

    console.error("Xero P&L error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profit & loss data" },
      { status: 500 }
    );
  }
}
