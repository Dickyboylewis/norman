/**
 * Xero OAuth 2.0 — Initiate Connection
 *
 * Redirects the user to Xero's authorization page.
 * After authorising, Xero will redirect back to /api/xero/callback.
 */

import { NextResponse } from "next/server";

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID ?? "";
const XERO_REDIRECT_URI =
  process.env.XERO_REDIRECT_URI ?? "http://127.0.0.1:3000/api/xero/callback";

const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.reports.read",
  "accounting.settings.read",
  "offline_access",
].join(" ");

export async function GET() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: XERO_CLIENT_ID,
    redirect_uri: XERO_REDIRECT_URI,
    scope: XERO_SCOPES,
    state: crypto.randomUUID(),
  });

  const url = `https://login.xero.com/identity/connect/authorize?${params.toString()}`;

  return NextResponse.redirect(url);
}
