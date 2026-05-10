import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD_ID = 1461714569;
const ACCOUNT_COL = "board_relation5";

async function discoverAccountColId(apiKey: string): Promise<string> {
  const schemaQuery = `query { boards(ids: [${CONTACTS_BOARD_ID}]) { columns { id title type } } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query: schemaQuery }),
  });
  const data = await res.json();
  const cols: { id: string; title: string; type: string }[] = data.data?.boards?.[0]?.columns || [];
  const relCol = cols.find(c =>
    c.type === "board_relation" &&
    (c.title.toLowerCase().includes("company") || c.title.toLowerCase().includes("account"))
  );
  return relCol?.id ?? ACCOUNT_COL;
}

async function getCurrentAccountId(apiKey: string, contactId: string, colId: string): Promise<string | null> {
  const query = `query {
    items(ids: [${contactId}]) {
      column_values(ids: ["${colId}"]) {
        ... on BoardRelationValue { linked_items { id } }
        value
      }
    }
  }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  const col = data.data?.items?.[0]?.column_values?.[0];
  if (!col) return null;

  if (Array.isArray(col.linked_items) && col.linked_items.length > 0)
    return String(col.linked_items[0].id);

  if (col.value) {
    try {
      const parsed = JSON.parse(col.value);
      const ids: unknown[] = parsed.linkedPulseIds ?? parsed.linkedItemIds ?? parsed.item_ids ?? [];
      if (ids.length > 0) {
        const first = ids[0];
        return String(typeof first === "object" && first !== null && "linkedPulseId" in first
          ? (first as { linkedPulseId: number }).linkedPulseId
          : first);
      }
    } catch { /* ignore */ }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { contactId, newAccountId } = await request.json();
    if (!contactId || !newAccountId)
      return NextResponse.json({ error: "Missing contactId or newAccountId" }, { status: 400 });

    const accountColId = await discoverAccountColId(apiKey);

    // Layer 1: skip write if already linked
    const currentAccountId = await getCurrentAccountId(apiKey, contactId, accountColId);
    if (currentAccountId === String(newAccountId)) {
      return NextResponse.json({ success: true, alreadyLinked: true, contactId, accountId: newAccountId });
    }

    const valueJson = JSON.stringify({ item_ids: [Number(newAccountId)] });
    const escapedValue = JSON.stringify(valueJson);
    const mutation = `mutation { change_column_value(item_id: ${contactId}, board_id: ${CONTACTS_BOARD_ID}, column_id: "${accountColId}", value: ${escapedValue}) { id } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query: mutation }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || "Monday write failed");

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
