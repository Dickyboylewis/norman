import { NextRequest, NextResponse } from "next/server";
import { consumeNonce } from "@/lib/calendar-nonces";
import { setTokens } from "@/lib/calendar-tokens";
import type { DirectorTokenData } from "@/lib/calendar-tokens";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code        = searchParams.get("code");
  const state       = searchParams.get("state");
  const errorParam  = searchParams.get("error");

  const baseUrl  = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://wte.red";
  const dashUrl  = `${baseUrl}/dashboard/sales`;

  if (errorParam) {
    return NextResponse.redirect(`${dashUrl}?calendarError=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${dashUrl}?calendarError=missing_code`);
  }

  const directorName = consumeNonce(state);
  if (!directorName) {
    return NextResponse.redirect(`${dashUrl}?calendarError=invalid_state`);
  }

  const clientId     = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  const redirectUri  = `${baseUrl}/api/calendar/oauth-callback`;

  try {
    // Exchange authorisation code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId!,
        client_secret: clientSecret!,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?:  string;
      refresh_token?: string;
      expires_in?:    number;
      error?:         string;
    };

    if (!tokenData.access_token || !tokenData.refresh_token) {
      const reason = tokenData.error ?? "no_tokens";
      return NextResponse.redirect(`${dashUrl}?calendarError=${encodeURIComponent(reason)}`);
    }

    // Fetch the Google account email
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = (await userRes.json()) as { email?: string };

    const tokens: DirectorTokenData = {
      refreshToken:       tokenData.refresh_token,
      accessToken:        tokenData.access_token,
      accessTokenExpiry:  Date.now() + (tokenData.expires_in ?? 3600) * 1000,
      googleEmail:        userData.email ?? "",
      connectedAt:        new Date().toISOString(),
      lastSyncAt:         null,
    };

    setTokens(directorName, tokens);

    return NextResponse.redirect(`${dashUrl}?calendarConnected=1`);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(`${dashUrl}?calendarError=${encodeURIComponent(reason)}`);
  }
}
