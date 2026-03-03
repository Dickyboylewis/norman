/**
 * Xero OAuth 2.0 Token Management
 *
 * Handles:
 *  - Token storage (file-based for simplicity; swap for DB in production)
 *  - Token refresh using the refresh_token grant
 *  - Helper to get a valid access token for API calls
 *  - Helper to get the Xero tenant (organisation) ID
 */

import { readFile, writeFile } from "fs/promises";
import path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

interface XeroTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix epoch ms
  tenant_id?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOKEN_FILE = path.join(process.cwd(), ".xero-tokens.json");

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID ?? "";
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET ?? "";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_CONNECTIONS_URL = "https://api.xero.com/connections";

// ─── Token persistence ──────────────────────────────────────────────────────

export async function saveTokens(tokens: XeroTokens): Promise<void> {
  await writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf-8");
}

export async function loadTokens(): Promise<XeroTokens | null> {
  try {
    const raw = await readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(raw) as XeroTokens;
  } catch {
    return null;
  }
}

// ─── Token refresh ───────────────────────────────────────────────────────────

async function refreshAccessToken(
  refreshToken: string
): Promise<XeroTokens> {
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString(
          "base64"
        ),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  const tokens: XeroTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  // Fetch tenant ID
  const connRes = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (connRes.ok) {
    const connections = await connRes.json();
    if (connections.length > 0) {
      tokens.tenant_id = connections[0].tenantId;
    }
  }

  await saveTokens(tokens);
  return tokens;
}

// ─── Public helpers ──────────────────────────────────────────────────────────

/**
 * Returns a valid access token, refreshing if necessary.
 * Throws if no tokens are stored (user must connect Xero first).
 */
export async function getValidAccessToken(): Promise<{
  accessToken: string;
  tenantId: string;
}> {
  let tokens = await loadTokens();

  if (!tokens) {
    throw new Error("XERO_NOT_CONNECTED");
  }

  // Refresh if token expires within 60 seconds
  if (Date.now() > tokens.expires_at - 60_000) {
    tokens = await refreshAccessToken(tokens.refresh_token);
  }

  if (!tokens.tenant_id) {
    throw new Error("XERO_NO_TENANT");
  }

  return {
    accessToken: tokens.access_token,
    tenantId: tokens.tenant_id,
  };
}

/**
 * Exchange an authorisation code for tokens (used by the callback route).
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<XeroTokens> {
  const res = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString(
          "base64"
        ),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xero code exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  const tokens: XeroTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  // Fetch tenant ID
  const connRes = await fetch(XERO_CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (connRes.ok) {
    const connections = await connRes.json();
    if (connections.length > 0) {
      tokens.tenant_id = connections[0].tenantId;
    }
  }

  await saveTokens(tokens);
  return tokens;
}
