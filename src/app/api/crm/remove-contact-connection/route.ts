import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD_ID = 1461714569;
const RELATION_COL = "board_relation_mm25s0kr";

async function getLinkedIds(apiKey: string, contactId: string): Promise<string[]> {
  const query = `query {
    items(ids: [${contactId}]) {
      column_values(ids: ["${RELATION_COL}"]) {
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
  if (!col) return [];

  if (Array.isArray(col.linked_items) && col.linked_items.length > 0)
    return col.linked_items.map((li: { id: string }) => li.id);

  if (col.value) {
    try {
      const parsed = JSON.parse(col.value);
      if (Array.isArray(parsed.linkedPulseIds))
        return parsed.linkedPulseIds.map((x: { linkedPulseId: number } | number) =>
          String(typeof x === "object" ? x.linkedPulseId : x));
      if (Array.isArray(parsed.item_ids)) return parsed.item_ids.map(String);
    } catch { /* ignore */ }
  }
  return [];
}

async function setLinkedIds(apiKey: string, contactId: string, ids: string[]): Promise<void> {
  const valueJson = JSON.stringify({ item_ids: ids.map(Number) });
  const escapedValue = JSON.stringify(valueJson);
  const mutation = `mutation { change_column_value(item_id: ${contactId}, board_id: ${CONTACTS_BOARD_ID}, column_id: "${RELATION_COL}", value: ${escapedValue}) { id } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query: mutation }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "Monday write failed");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { contactId, connectedContactId } = await request.json();
    if (!contactId || !connectedContactId)
      return NextResponse.json({ error: "Missing contactId or connectedContactId" }, { status: 400 });

    const current = await getLinkedIds(apiKey, contactId);
    const updated = current.filter(id => id !== connectedContactId);
    await setLinkedIds(apiKey, contactId, updated);

    return NextResponse.json({ success: true, connectedToIds: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
