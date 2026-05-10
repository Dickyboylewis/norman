const CONTACTS_BOARD_ID = 1461714569;
const RELATION_COL = "board_relation_mm25s0kr";
const MONDAY_API = "https://api.monday.com/v2";

async function mondayPost(apiKey: string, query: string) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || "Monday write failed");
  return data;
}

export async function getLinkedIds(apiKey: string, contactId: string): Promise<string[]> {
  const query = `query {
    items(ids: [${contactId}]) {
      column_values(ids: ["${RELATION_COL}"]) {
        ... on BoardRelationValue { linked_items { id } }
        value
      }
    }
  }`;
  const data = await mondayPost(apiKey, query);
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

export async function setLinkedIds(apiKey: string, contactId: string, ids: string[]): Promise<void> {
  const valueJson = JSON.stringify({ item_ids: ids.map(Number) });
  const escapedValue = JSON.stringify(valueJson);
  const mutation = `mutation { change_column_value(item_id: ${contactId}, board_id: ${CONTACTS_BOARD_ID}, column_id: "${RELATION_COL}", value: ${escapedValue}) { id } }`;
  await mondayPost(apiKey, mutation);
}

export async function addReciprocalConnection(
  apiKey: string,
  contactId: string,
  connectedContactId: string,
): Promise<void> {
  const currentA = await getLinkedIds(apiKey, contactId);
  if (currentA.includes(connectedContactId)) return; // already connected, idempotent

  const updatedA = Array.from(new Set([...currentA, connectedContactId]));
  await setLinkedIds(apiKey, contactId, updatedA);

  await new Promise(r => setTimeout(r, 100));

  try {
    const currentB = await getLinkedIds(apiKey, connectedContactId);
    const updatedB = Array.from(new Set([...currentB, contactId]));
    await setLinkedIds(apiKey, connectedContactId, updatedB);
  } catch (e) {
    // Rollback A
    try { await setLinkedIds(apiKey, contactId, currentA); } catch { /* best effort */ }
    throw new Error(`Reciprocal write failed: ${e instanceof Error ? e.message : "unknown"}`);
  }
}
