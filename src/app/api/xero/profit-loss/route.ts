import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const tokenPath = path.join(process.cwd(), '.xero-token.json');

  // 1. Check if we have logged in yet
  if (!fs.existsSync(tokenPath)) {
    return NextResponse.json({ error: "No token found. Needs auth." }, { status: 401 });
  }

  try {
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    const accessToken = tokenData.access_token;
    const tenantId = tokenData.tenantId;

    // 2. We have a token! Let's try to fetch the invoices
    const invoicesResponse = await fetch("https://api.xero.com/api.xro/2.0/Invoices?Statuses=AUTHORISED,PAID", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        "Accept": "application/json"
      }
    });

    if (!invoicesResponse.ok) {
       // If the token expired, we will handle refresh logic later. For now, prompt re-auth.
       return NextResponse.json({ error: "Token expired or invalid. Needs auth." }, { status: 401 });
    }

    const invoicesData = await invoicesResponse.json();
    const invoices = invoicesData.Invoices || [];

    // 3. Setup our blank slate for the chart
    const monthlyTotals: Record<string, { month: string, cashIn: number, cashOut: number }> = {
      "Oct": { month: "Oct", cashIn: 0, cashOut: 0 },
      "Nov": { month: "Nov", cashIn: 0, cashOut: 0 },
      "Dec": { month: "Dec", cashIn: 0, cashOut: 0 },
      "Jan": { month: "Jan", cashIn: 0, cashOut: 0 },
      "Feb": { month: "Feb", cashIn: 0, cashOut: 0 },
      "Mar": { month: "Mar", cashIn: 0, cashOut: 0 },
    };

    // Helper for dates
    const parseDate = (dString: string) => {
        if (!dString) return new Date();
        if (dString.includes('/Date(')) {
            return new Date(parseInt(dString.match(/\d+/)?.[0] || "0", 10));
        }
        return new Date(dString);
    }

    // 4. Crunch the data
    invoices.forEach((inv: any) => {
      const date = parseDate(inv.DateString || inv.Date);
      const monthName = date.toLocaleString('default', { month: 'short' });

      if (monthlyTotals[monthName]) {
         const amount = inv.Total || 0;
         if (inv.Type === "ACCREC") monthlyTotals[monthName].cashIn += amount;
         if (inv.Type === "ACCPAY") monthlyTotals[monthName].cashOut += amount;
      }
    });

    const chartData = [
      monthlyTotals["Oct"],
      monthlyTotals["Nov"],
      monthlyTotals["Dec"],
      monthlyTotals["Jan"],
      monthlyTotals["Feb"],
      monthlyTotals["Mar"]
    ];

    return NextResponse.json(chartData);

  } catch (error) {
    console.error("Xero Fetch Error:", error);
    return NextResponse.json({ error: "Failed to read token or fetch data." }, { status: 500 });
  }
}