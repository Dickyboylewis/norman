/**
 * Xero OAuth 2.0 — Callback
 *
 * Receives the authorisation code from Xero, exchanges it for tokens,
 * and redirects the user back to the dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/xero";

const XERO_REDIRECT_URI =
  process.env.XERO_REDIRECT_URI ?? "http://localhost:3000/api/xero/callback";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorisation code" },
      { status: 400 }
    );
  }

  try {
    await exchangeCodeForTokens(code, XERO_REDIRECT_URI);

    // Redirect back to the dashboard after successful connection
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Xero callback error:", error);
    return NextResponse.json(
      { error: "Failed to connect Xero account" },
      { status: 500 }
    );
  }
}
