import { NextRequest, NextResponse } from "next/server";
import { ensureLogoColumns } from "@/lib/monday-columns";
import type { AccountNode } from "@/types/crm";

export const dynamic = "force-dynamic";

const ACCOUNTS_BOARD_ID = 1461714573;

function typeToCluster(type: string | null): "consultants" | "clients" | "unknown" {
  if (!type) return "unknown";
  const t = type.toLowerCase();
  if (t === "client") return "clients";
  if (t === "consultant" || t === "agent") return "consultants";
  return "unknown";
}

async function tryFetchLogoUrl(domain: string): Promise<string | null> {
  const sources = [
    `https://${domain}/apple-touch-icon.png`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 Norman-Logo-Fetcher", "Accept": "image/*" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.startsWith("image/")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 200) continue;
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

async function discoverTypeColumnId(apiKey: string): Promise<string> {
  const query = `query { boards(ids: [${ACCOUNTS_BOARD_ID}]) { columns { id title type settings_str } } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  const allColumns: { id: string; title: string; type: string; settings_str: string }[] =
    data.data?.boards?.[0]?.columns || [];
  for (const col of allColumns) {
    if (col.type === "status" || col.type === "color") {
      try {
        const settings = JSON.parse(col.settings_str || "{}");
        const labels = settings.labels || {};
        const labelValues = Object.values(labels).map(l => String(l).toLowerCase());
        if (labelValues.some(l => l.includes("client") || l.includes("consultant"))) {
          return col.id;
        }
      } catch {
        continue;
      }
    }
  }
  return "status";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const body = await request.json();
    const name: string = (body.name || "").trim();
    const type: string | null = body.type || null;
    const rawDomain: string = (body.domain || "").trim();

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (type && !["Client", "Consultant", "Agent"].includes(type))
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const domain = rawDomain
      ? rawDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
      : "";

    await new Promise(r => setTimeout(r, 100));

    // Create the item on Monday
    const escapedName = JSON.stringify(name);
    const createQuery = `mutation { create_item(board_id: ${ACCOUNTS_BOARD_ID}, item_name: ${escapedName}) { id } }`;
    const createRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query: createQuery }),
    });
    const createData = await createRes.json();
    if (createData.errors)
      return NextResponse.json(
        { error: createData.errors[0]?.message || "Create failed" },
        { status: 500 },
      );

    const itemId: string = createData.data?.create_item?.id;
    if (!itemId) return NextResponse.json({ error: "No item ID returned" }, { status: 500 });

    // Set type column
    if (type) {
      const typeColId = await discoverTypeColumnId(apiKey);
      const valueJson = JSON.stringify({ label: type });
      const escapedValue = JSON.stringify(valueJson);
      const typeQuery = `mutation { change_column_value(item_id: ${itemId}, board_id: ${ACCOUNTS_BOARD_ID}, column_id: "${typeColId}", value: ${escapedValue}) { id } }`;
      await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
        body: JSON.stringify({ query: typeQuery }),
      });
    }

    // Set domain column and fetch logo
    let logoUrl = "";
    if (domain) {
      const domainEscaped = JSON.stringify(domain);
      const domainQuery = `mutation { change_simple_column_value(item_id: ${itemId}, board_id: ${ACCOUNTS_BOARD_ID}, column_id: "company_domain", value: ${domainEscaped}) { id } }`;
      await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
        body: JSON.stringify({ query: domainQuery }),
      });

      const fetchedUrl = await tryFetchLogoUrl(domain);
      if (fetchedUrl) {
        logoUrl = fetchedUrl;
        const columnIds = await ensureLogoColumns(apiKey);
        const colVals: Record<string, string> = {
          [columnIds.logoUrlColId]: fetchedUrl,
          [columnIds.logoSourceColId]: "auto",
        };
        const escapedColVals = JSON.stringify(JSON.stringify(colVals));
        const logoQuery = `mutation { change_multiple_column_values(item_id: ${itemId}, board_id: ${ACCOUNTS_BOARD_ID}, column_values: ${escapedColVals}) { id } }`;
        await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
          body: JSON.stringify({ query: logoQuery }),
        });
      } else {
        logoUrl = `/api/logo?domain=${domain}`;
      }
    }

    const account: AccountNode = {
      id: itemId,
      name,
      domain,
      logoUrl,
      cluster: typeToCluster(type),
      accountType: type || "",
      contacts: [],
      contactCount: 0,
      directors: [],
    };

    return NextResponse.json({ success: true, account });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
