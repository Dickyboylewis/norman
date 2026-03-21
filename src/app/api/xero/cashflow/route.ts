import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/xero";

export async function GET() {
  try {
    const { accessToken, tenantId } = await getValidAccessToken();

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const fromDate = sixMonthsAgo.toISOString().split("T")[0];
    const toDate = now.toISOString().split("T")[0];

    const url = `https://api.xero.com/api.xro/2.0/Reports/BankSummary?fromDate=${fromDate}&toDate=${toDate}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Xero Bank Summary error:", errText);
      return NextResponse.json({ error: "Failed to fetch from Xero" }, { status: 502 });
    }

    const data = await res.json();
    const report = data.Reports?.[0];
    if (!report) {
      return NextResponse.json({ error: "No report data" }, { status: 502 });
    }

    const allRows = report.Rows || [];
    const headerRow = allRows.find((r: any) => r.RowType === "Header");
    const headers = headerRow?.Cells?.slice(1).map((c: any) => c.Value) || [];

    // Find cash in and cash out rows
    let cashInRow: any = null;
    let cashOutRow: any = null;

    for (const section of allRows) {
      for (const row of (section.Rows || [])) {
        const label = row.Cells?.[0]?.Value?.toLowerCase() || "";
        if (label.includes("received") || label.includes("cash in")) cashInRow = row;
        if (label.includes("spent") || label.includes("cash out")) cashOutRow = row;
      }
      const label = section.Cells?.[0]?.Value?.toLowerCase() || "";
      if (label.includes("received") || label.includes("cash in")) cashInRow = section;
      if (label.includes("spent") || label.includes("cash out")) cashOutRow = section;
    }

    const months = headers.map((month: string, i: number) => {
      const cashIn = Math.abs(parseFloat(cashInRow?.Cells?.[i + 1]?.Value || "0"));
      const cashOut = Math.abs(parseFloat(cashOutRow?.Cells?.[i + 1]?.Value || "0"));
      return { month, cashIn, cashOut };
    });

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