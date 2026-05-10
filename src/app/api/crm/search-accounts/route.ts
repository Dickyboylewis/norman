import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ACCOUNTS_BOARD_ID = 1461714573;

let cachedAccounts: { id: string; name: string; accountType: string }[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadAccounts(apiKey: string): Promise<{ id: string; name: string; accountType: string }[]> {
  if (cachedAccounts && Date.now() < cacheExpiry) return cachedAccounts;

  let allItems: { id: string; name: string; accountType: string }[] = [];
  let cursor: string | null = null;

  do {
    const query: string = cursor
      ? `query { next_items_page(limit: 200, cursor: "${cursor}") { cursor items { id name column_values { id text } } } }`
      : `query { boards(ids: [${ACCOUNTS_BOARD_ID}]) { items_page(limit: 200) { cursor items { id name column_values { id text } } } } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();

    const page: { cursor?: string; items: { id: string; name: string; column_values: { id: string; text: string }[] }[] } | undefined = cursor
      ? data.data?.next_items_page
      : data.data?.boards?.[0]?.items_page;

    const items: { id: string; name: string; column_values: { id: string; text: string }[] }[] =
      page?.items || [];

    for (const item of items) {
      const statusCol = item.column_values.find(c => c.id === "status");
      allItems.push({
        id: item.id,
        name: item.name,
        accountType: statusCol?.text || "",
      });
    }

    cursor = page?.cursor || null;
  } while (cursor);

  cachedAccounts = allItems;
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return allItems;
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const q = request.nextUrl.searchParams.get("q") || "";
  const trimmed = q.trim().toLowerCase();

  try {
    const accounts = await loadAccounts(apiKey);
    const results = trimmed
      ? accounts.filter(a => a.name.toLowerCase().includes(trimmed)).slice(0, 10)
      : accounts.slice(0, 10);

    return NextResponse.json({ accounts: results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
