import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.XERO_CLIENT_ID;
  const redirectUri = process.env.XERO_REDIRECT_URI;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId || "",
    redirect_uri: redirectUri || "",
    scope: "openid profile email offline_access accounting.reports.profitandloss.read accounting.reports.balancesheet.read accounting.reports.banksummary.read accounting.banktransactions.read accounting.settings.read",
    state: crypto.randomUUID(),
  });

  const authUrl = `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}