import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD_ID = 1461714569;
const RELATION_COL = "board_relation_mm25s0kr";
const BACKFILL_SECRET = "norman-backfill-2026";

type ContactRecord = { id: string; name: string; linkedIds: string[] };

async function fetchAllContacts(apiKey: string): Promise<ContactRecord[]> {
  const all: ContactRecord[] = [];
  let cursor: string | null = null;

  do {
    const query: string = cursor
      ? `query { next_items_page(limit: 200, cursor: "${cursor}") { cursor items { id name column_values(ids: ["${RELATION_COL}"]) { ... on BoardRelationValue { linked_items { id } } value } } } }`
      : `query { boards(ids: [${CONTACTS_BOARD_ID}]) { items_page(limit: 200) { cursor items { id name column_values(ids: ["${RELATION_COL}"]) { ... on BoardRelationValue { linked_items { id } } value } } } } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();

    type PageItem = { id: string; name: string; column_values: { linked_items?: { id: string }[]; value?: string }[] };
    type Page = { cursor?: string; items: PageItem[] };
    const page: Page | undefined = cursor
      ? data.data?.next_items_page
      : data.data?.boards?.[0]?.items_page;

    for (const item of (page?.items ?? [])) {
      const col = item.column_values?.[0];
      let linkedIds: string[] = [];
      if (col) {
        if (Array.isArray(col.linked_items) && col.linked_items.length > 0) {
          linkedIds = col.linked_items.map((li: { id: string }) => li.id);
        } else if (col.value) {
          try {
            const parsed = JSON.parse(col.value);
            if (Array.isArray(parsed.linkedPulseIds))
              linkedIds = parsed.linkedPulseIds.map((x: { linkedPulseId: number } | number) =>
                String(typeof x === "object" ? x.linkedPulseId : x));
            else if (Array.isArray(parsed.item_ids))
              linkedIds = parsed.item_ids.map(String);
          } catch { /* ignore */ }
        }
      }
      all.push({ id: item.id, name: item.name, linkedIds });
    }

    cursor = page?.cursor ?? null;
  } while (cursor);

  return all;
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

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== BACKFILL_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    console.log("[backfill] Fetching all contacts…");
    const contacts = await fetchAllContacts(apiKey);
    console.log(`[backfill] Loaded ${contacts.length} contacts`);

    // Build current connection map
    const linkedMap = new Map<string, Set<string>>();
    for (const c of contacts) linkedMap.set(c.id, new Set(c.linkedIds));

    // Discover missing reverse links: for each A→B, if B does not have A, mark B for update
    const updates = new Map<string, Set<string>>(); // contactId → set of ids to add
    for (const contact of contacts) {
      for (const linkedId of contact.linkedIds) {
        if (!linkedMap.has(linkedId)) continue; // linked contact not in board (deleted?)
        if (!linkedMap.get(linkedId)!.has(contact.id)) {
          if (!updates.has(linkedId)) updates.set(linkedId, new Set());
          updates.get(linkedId)!.add(contact.id);
        }
      }
    }

    const oneSidedTotal = Array.from(updates.values()).reduce((s, v) => s + v.size, 0);
    console.log(`[backfill] ${updates.size} contacts need updates (${oneSidedTotal} missing reverse links)`);

    const errors: string[] = [];
    let processed = 0;
    let i = 0;

    for (const [contactId, idsToAdd] of updates.entries()) {
      i++;
      const contact = contacts.find(c => c.id === contactId);
      const current = linkedMap.get(contactId) ?? new Set<string>();
      const newIds = Array.from(new Set([...current, ...idsToAdd]));
      const names = Array.from(idsToAdd).map(id => contacts.find(c => c.id === id)?.name ?? id).join(", ");

      try {
        await setLinkedIds(apiKey, contactId, newIds);
        console.log(`[backfill] (${i}/${updates.size}) Fixed ${contact?.name ?? contactId}: added ${names}`);
        processed++;
      } catch (e) {
        const msg = `Failed ${contact?.name ?? contactId}: ${e instanceof Error ? e.message : "unknown"}`;
        console.error(`[backfill] ${msg}`);
        errors.push(msg);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`[backfill] Done. Updated ${processed}/${updates.size}. Errors: ${errors.length}`);
    return NextResponse.json({ totalContacts: contacts.length, oneSidedConnectionsFound: oneSidedTotal, contactsUpdated: processed, errors });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
