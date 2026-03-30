import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/xero";

/**
 * GET /api/xero/net-profit
 *
 * Returns Year-to-Date (YTD) Net Profit from Xero's Profit & Loss report.
 *
 * Financial Year starts on August 1st.
 *  - If current month >= August  → fromDate = Aug 1st of current year
 *  - If current month < August   → fromDate = Aug 1st of previous year
 *  - toDate = today
 *  - periods = number of months from fromDate to toDate (inclusive)
 *
 * Also fetches the same period for the previous financial year and returns
 * a Year-over-Year (YoY) percentage change.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns { fromDate, toDate, periods } for the current FY up to today */
function getCurrentFYRange(now: Date): {
  fromDate: string;
  toDate: string;
  periods: number;
} {
  const month = now.getMonth(); // 0-indexed; July = 6, August = 7
  const year = now.getFullYear();

  // FY starts Aug 1. If we're in Aug–Dec (month >= 7), FY started this year.
  // If we're in Jan–Jul (month < 7), FY started last year.
  const fyStartYear = month >= 7 ? year : year - 1;

  const fromDate = `${fyStartYear}-08-01`;
  const toDate = now.toISOString().split("T")[0]; // today

  // Periods = months from Aug 1 of fyStartYear to today (inclusive)
  // e.g. Aug=1, Sep=2, ... Jul=12
  const fyStartMonth = 7; // August (0-indexed)
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Months elapsed = (currentYear - fyStartYear) * 12 + (currentMonth - fyStartMonth) + 1
  const periods =
    (currentYear - fyStartYear) * 12 + (currentMonth - fyStartMonth) + 1;

  return { fromDate, toDate, periods };
}

/** Returns { fromDate, toDate, periods } for the previous FY (same relative span) */
function getPreviousFYRange(now: Date): {
  fromDate: string;
  toDate: string;
  periods: number;
} {
  // Shift now back by exactly 1 year to get the same relative position in the prior FY
  const prevNow = new Date(now);
  prevNow.setFullYear(prevNow.getFullYear() - 1);

  const { fromDate, toDate, periods } = getCurrentFYRange(prevNow);
  return { fromDate, toDate, periods };
}

/** Formats a YYYY-MM-DD string as "1 Aug 2025" */
function formatDisplayDate(isoDate: string): string {
  // Parse as UTC to avoid timezone shifts
  const [year, month, day] = isoDate.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Recursively scans all Rows (and nested Rows within Sections) looking for
 *  any object where RowType is 'Row' or 'SummaryRow' and Cells[0].Value
 *  includes the string 'Net Profit' (case-insensitive). */
function findNetProfitRow(rows: any[]): any | null {
  for (const row of rows) {
    // Check if this row itself is a match
    if (
      (row.RowType === "Row" || row.RowType === "SummaryRow") &&
      row.Cells?.[0]?.Value?.toLowerCase().includes("net profit")
    ) {
      return row;
    }

    // Recurse into nested Rows (e.g. inside a Section)
    if (Array.isArray(row.Rows) && row.Rows.length > 0) {
      const found = findNetProfitRow(row.Rows);
      if (found) return found;
    }
  }

  return null;
}

/** Fetches a Xero P&L report and returns the total net profit */
async function fetchNetProfitTotal(
  accessToken: string,
  tenantId: string,
  fromDate: string,
  toDate: string,
  periods: number
): Promise<{ total: number; months: { month: string; netProfit: number }[] }> {
  const url = `https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}&periods=${periods}&timeframe=MONTH`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Xero P&L error (${fromDate}→${toDate}):`, errText);
    throw new Error("Failed to fetch P&L from Xero");
  }

  const data = await res.json();
  const report = data.Reports?.[0];
  if (!report) throw new Error("No report data returned");

  const allRows: any[] = report.Rows || [];

  // Extract column headers
  const headerRow = allRows.find((r: any) => r.RowType === "Header");
  const headers: string[] =
    headerRow?.Cells?.slice(1).map((c: any) => c.Value) ?? [];

  const netProfitRow = findNetProfitRow(allRows);

  const months: { month: string; netProfit: number }[] = [];

  if (netProfitRow) {
    const cells: any[] = netProfitRow.Cells?.slice(1) ?? [];
    cells.forEach((cell: any, i: number) => {
      const value = parseFloat(cell.Value ?? "0") || 0;
      const label = headers[i] ?? `Month ${i + 1}`;
      if (label.toLowerCase() === "ytd") return;
      months.push({ month: label, netProfit: Math.round(value * 100) / 100 });
    });
  }

  // Xero returns cumulative YTD figures per month, so the most recent month
  // (first in the array, as Xero orders newest-first) is the true YTD total.
  const total = months.length > 0 ? months[0].netProfit : 0;

  return { total, months };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { accessToken, tenantId } = await getValidAccessToken();

    const now = new Date();

    // ── Current FY range ────────────────────────────────────────────────────
    const current = getCurrentFYRange(now);

    // ── Previous FY range (same relative span, 1 year earlier) ─────────────
    const previous = getPreviousFYRange(now);

    // ── Fetch both periods in parallel ──────────────────────────────────────
    const [currentResult, previousResult] = await Promise.all([
      fetchNetProfitTotal(
        accessToken,
        tenantId,
        current.fromDate,
        current.toDate,
        current.periods
      ),
      fetchNetProfitTotal(
        accessToken,
        tenantId,
        previous.fromDate,
        previous.toDate,
        previous.periods
      ),
    ]);

    // ── YoY percentage change ───────────────────────────────────────────────
    let yoyPercent: number | null = null;
    if (previousResult.total !== 0) {
      yoyPercent =
        Math.round(
          ((currentResult.total - previousResult.total) /
            Math.abs(previousResult.total)) *
            100 *
            10
        ) / 10; // 1 decimal place
    }

    return NextResponse.json({
      netProfit: currentResult.total,
      months: currentResult.months,
      fromDate: formatDisplayDate(current.fromDate),
      toDate: formatDisplayDate(current.toDate),
      previousFromDate: formatDisplayDate(previous.fromDate),
      previousToDate: formatDisplayDate(previous.toDate),
      previousNetProfit: previousResult.total,
      yoyPercent,
      connected: true,
    });
  } catch (error: any) {
    console.error("Net Profit API Error:", error?.message ?? error);
    if (
      error?.message === "XERO_NOT_CONNECTED" ||
      error?.message === "XERO_NO_TENANT"
    ) {
      return NextResponse.json(
        { error: "Xero not connected" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch net profit data" },
      { status: 500 }
    );
  }
}
