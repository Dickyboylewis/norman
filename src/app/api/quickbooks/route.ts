/**
 * QuickBooks API Route
 *
 * This server-side route fetches income/cash flow data from QuickBooks Online.
 * Your API keys and tokens NEVER leave the server — the client only receives
 * the processed JSON response.
 *
 * REQUIRED ENVIRONMENT VARIABLES (add to .env.local):
 *   QUICKBOOKS_CLIENT_ID       - From https://developer.intuit.com/
 *   QUICKBOOKS_CLIENT_SECRET   - From https://developer.intuit.com/
 *   QUICKBOOKS_REFRESH_TOKEN   - OAuth2 refresh token (obtained after initial auth flow)
 *   QUICKBOOKS_REALM_ID        - Your QuickBooks company ID (realmId)
 *   QUICKBOOKS_SANDBOX         - Set to "true" for sandbox, "false" for production
 *
 * QuickBooks OAuth2 Setup:
 *   1. Create an app at https://developer.intuit.com/app/developer/qbo/docs/get-started
 *   2. Use the OAuth 2.0 Playground to get your initial tokens
 *   3. Store the refresh token in your .env.local (it auto-refreshes)
 *
 * TODO: Replace the mock data below with real QuickBooks API calls.
 * Recommended library: node-quickbooks or direct REST calls to:
 *   https://quickbooks.api.intuit.com/v3/company/{realmId}/reports/ProfitAndLoss
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuickBooksData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  currency: string;
  period: string;
  monthlyProjections: {
    month: string;
    projected: number;
    actual: number | null;
  }[];
  lastUpdated: string;
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  // Protect this route — only authenticated users can call it
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ─── TODO: Replace with real QuickBooks API call ───────────────────────
    //
    // Example using the QuickBooks REST API:
    //
    // const baseUrl = process.env.QUICKBOOKS_SANDBOX === "true"
    //   ? "https://sandbox-quickbooks.api.intuit.com"
    //   : "https://quickbooks.api.intuit.com";
    //
    // // First, refresh the access token using the refresh token
    // const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/x-www-form-urlencoded",
    //     Authorization: `Basic ${Buffer.from(
    //       `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
    //     ).toString("base64")}`,
    //   },
    //   body: new URLSearchParams({
    //     grant_type: "refresh_token",
    //     refresh_token: process.env.QUICKBOOKS_REFRESH_TOKEN!,
    //   }),
    // });
    // const { access_token } = await tokenResponse.json();
    //
    // // Then fetch the Profit & Loss report
    // const realmId = process.env.QUICKBOOKS_REALM_ID;
    // const reportResponse = await fetch(
    //   `${baseUrl}/v3/company/${realmId}/reports/ProfitAndLoss?date_macro=This%20Year`,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${access_token}`,
    //       Accept: "application/json",
    //     },
    //   }
    // );
    // const reportData = await reportResponse.json();
    // ─── End TODO ─────────────────────────────────────────────────────────────

    // Mock data — remove this block once you connect the real API
    const mockData: QuickBooksData = {
      totalIncome: 142500,
      totalExpenses: 87300,
      netIncome: 55200,
      currency: "GBP",
      period: "January – June 2025",
      monthlyProjections: [
        { month: "Jan", projected: 22000, actual: 21400 },
        { month: "Feb", projected: 23000, actual: 24100 },
        { month: "Mar", projected: 24000, actual: 23800 },
        { month: "Apr", projected: 25000, actual: 26200 },
        { month: "May", projected: 26000, actual: 25100 },
        { month: "Jun", projected: 27000, actual: null },
      ],
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error("[QuickBooks API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch QuickBooks data" },
      { status: 500 }
    );
  }
}
