import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/xero";

function parseXeroDate(dateStr: string): Date {
  const match = dateStr.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
  if (match) return new Date(parseInt(match[1]));
  return new Date(dateStr);
}

const CREDIT_CARD_ACCOUNT_IDS = new Set([
  "a8fa9c65-c78b-4619-9704-fa641d2180db", // Credit Card (DL)
  "fa7836c7-71c0-4932-8796-3e1aa8c9babe", // DL C/card 0367
  "410444e9-a61d-4cb0-a688-47c7a4e5d653", // White-Red Ltd Credit Card
]);

export async function GET() {
  try {
    const { accessToken, tenantId } = await getValidAccessToken();
    const now = new Date();

    const monthRanges = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      monthRanges.push({
        label: d.toLocaleString("default", { month: "short" }),
        fromDate: d.toISOString().split("T")[0],
        toDate: lastDay.toISOString().split("T")[0],
        jsMonth: d.getMonth(),
        jsYear: d.getFullYear(),
      });
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    };

    // Step 1: BankSummary per month — sum only bank accounts, skip credit cards
    const rawMonths: {
      label: string;
      bankReceived: number;
      bankSpent: number;
    }[] = [];

    for (const m of monthRanges) {
      try {
        const url = `https://api.xero.com/api.xro/2.0/Reports/BankSummary?fromDate=${m.fromDate}&toDate=${m.toDate}`;
        const res = await fetch(url, { headers });

        if (!res.ok) {
          rawMonths.push({ label: m.label, bankReceived: 0, bankSpent: 0 });
          continue;
        }

        const data = await res.json();
        const allRows = data.Reports?.[0]?.Rows || [];

        let bankReceived = 0;
        let bankSpent = 0;

        for (const section of allRows) {
          for (const child of section.Rows || []) {
            if (child.RowType !== "Row") continue;
            const cells = child.Cells || [];
            const accountId =
              cells[0]?.Attributes?.find((a: any) => a.Id === "accountID")
                ?.Value || "";
            if (CREDIT_CARD_ACCOUNT_IDS.has(accountId)) continue;
            bankReceived += Math.abs(parseFloat(cells[2]?.Value || "0"));
            bankSpent += Math.abs(parseFloat(cells[3]?.Value || "0"));
          }
        }

        rawMonths.push({ label: m.label, bankReceived, bankSpent });
      } catch {
        rawMonths.push({ label: m.label, bankReceived: 0, bankSpent: 0 });
      }
    }

    // Step 2: BankTransfers — directional subtraction
    const firstFrom = monthRanges[0].fromDate.split("-");
    const lastTo = monthRanges[monthRanges.length - 1].toDate.split("-");
    const where = encodeURIComponent(
      `Date>=DateTime(${firstFrom[0]},${parseInt(firstFrom[1])},${parseInt(firstFrom[2])})&&Date<=DateTime(${lastTo[0]},${parseInt(lastTo[1])},${parseInt(lastTo[2])})`
    );

    const transfersIn: Record<string, number> = {};
    const transfersOut: Record<string, number> = {};

    for (const m of monthRanges) {
      transfersIn[m.label] = 0;
      transfersOut[m.label] = 0;
    }

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const tUrl = `https://api.xero.com/api.xro/2.0/BankTransfers?where=${where}&page=${page}`;
      const tRes = await fetch(tUrl, { headers });
      if (!tRes.ok) break;

      const tData = await tRes.json();
      const transfers = tData.BankTransfers || [];

      if (transfers.length === 0) {
        hasMore = false;
        break;
      }

      for (const t of transfers) {
        const tDate = parseXeroDate(t.Date);
        const fromIsCC = CREDIT_CARD_ACCOUNT_IDS.has(
          t.FromBankAccount?.AccountID || ""
        );
        const toIsCC = CREDIT_CARD_ACCOUNT_IDS.has(
          t.ToBankAccount?.AccountID || ""
        );

        for (const m of monthRanges) {
          if (
            tDate.getMonth() === m.jsMonth &&
            tDate.getFullYear() === m.jsYear
          ) {
            if (!fromIsCC) transfersOut[m.label] += t.Amount;
            if (!toIsCC) transfersIn[m.label] += t.Amount;
            break;
          }
        }
      }

      if (transfers.length < 100) hasMore = false;
      else page++;
    }

    // Step 3: Final figures
    const months = rawMonths.map((rm) => ({
      month: rm.label,
      cashIn:
        Math.round((rm.bankReceived - (transfersIn[rm.label] || 0)) * 100) /
        100,
      cashOut:
        Math.round((rm.bankSpent - (transfersOut[rm.label] || 0)) * 100) / 100,
    }));

    const totalCashIn =
      Math.round(months.reduce((s, m) => s + m.cashIn, 0) * 100) / 100;
    const totalCashOut =
      Math.round(months.reduce((s, m) => s + m.cashOut, 0) * 100) / 100;

    return NextResponse.json({
      months,
      totalCashIn,
      totalCashOut,
      difference: Math.round((totalCashIn - totalCashOut) * 100) / 100,
      connected: true,
    });
  } catch (error: any) {
    console.error("Cashflow API Error:", error?.message ?? error);
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
      { error: "Failed to fetch cashflow" },
      { status: 500 }
    );
  }
}