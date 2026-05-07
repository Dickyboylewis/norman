import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ACCOUNTS_BOARD_ID = 1461714573;

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { accountId, type } = await request.json();
    if (!accountId || !type) return NextResponse.json({ error: "Missing accountId or type" }, { status: 400 });

    // Dynamically discover the correct status column rather than hardcoding "status"
    const columnsQuery = `query { boards(ids: [${ACCOUNTS_BOARD_ID}]) { columns { id title type settings_str } } }`;
    const columnsRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: columnsQuery }),
    });
    const columnsData = await columnsRes.json();
    const allColumns: { id: string; title: string; type: string; settings_str: string }[] =
      columnsData.data?.boards?.[0]?.columns || [];

    let typeColumnId = "status";
    for (const col of allColumns) {
      if (col.type === "status" || col.type === "color") {
        try {
          const settings = JSON.parse(col.settings_str || "{}");
          const labels = settings.labels || {};
          const labelValues = Object.values(labels).map((l) => String(l).toLowerCase());
          if (labelValues.some((l) => l.includes("client") || l.includes("consultant"))) {
            typeColumnId = col.id;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    console.log("[update-account-type] Using column id:", typeColumnId, "for account:", accountId, "type:", type);

    const valueJson = JSON.stringify({ label: type });
    const escapedValue = JSON.stringify(valueJson);
    const query = `mutation { change_column_value(item_id: ${accountId}, board_id: ${ACCOUNTS_BOARD_ID}, column_id: "${typeColumnId}", value: ${escapedValue}) { id } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (data.errors) {
      console.error("[update-account-type] Monday error:", JSON.stringify(data.errors));
      return NextResponse.json({ error: data.errors[0]?.message || "Update failed" }, { status: 500 });
    }
    console.log("[update-account-type] Success:", JSON.stringify(data.data));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
