import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ACCOUNTS_BOARD_ID = 1461714573;
const CONTACTS_BOARD_ID = 1461714569;

interface ApplyBody {
  renames: Array<{ id: string; newName: string }>;
  merges: Array<{ canonicalId: string; duplicateIds: string[] }>;
}

type ContactScanItem = {
  id: string;
  column_values: Array<{ id: string; linked_items?: { id: string }[] }>;
};

async function changeItemName(apiKey: string, itemId: string, newName: string) {
  const escapedName = JSON.stringify(newName);
  const query = `mutation { change_item_name (item_id: ${itemId}, item_name: ${escapedName}) { id } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
}

async function getContactsLinkedToAccount(apiKey: string, accountId: string): Promise<string[]> {
  const allContacts: ContactScanItem[] = [];
  let cursor: string | null = null;
  let fetches = 0;

  while (fetches < 20) {
    const q: string = !cursor
      ? `query { boards(ids:[${CONTACTS_BOARD_ID}]) { items_page(limit:500) { cursor items { id column_values(ids:["contact_account"]) { id ... on BoardRelationValue { linked_items { id } } } } } } }`
      : `query { next_items_page(limit:500, cursor:"${cursor}") { cursor items { id column_values(ids:["contact_account"]) { id ... on BoardRelationValue { linked_items { id } } } } } }`;

    const r: Response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query: q }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d: any = await r.json();
    const page: { cursor?: string | null; items?: ContactScanItem[] } | undefined =
      !cursor ? d.data?.boards?.[0]?.items_page : d.data?.next_items_page;
    allContacts.push(...(page?.items || []));
    cursor = page?.cursor ?? null;
    if (!cursor) break;
    fetches++;
  }

  return allContacts
    .filter(c => c.column_values[0]?.linked_items?.some(li => li.id === accountId))
    .map(c => c.id);
}

// Cache the full contacts scan so we don't re-fetch for every duplicate
let cachedContactScan: ContactScanItem[] | null = null;

async function getContactsLinkedFast(apiKey: string, accountId: string): Promise<string[]> {
  if (!cachedContactScan) {
    cachedContactScan = [];
    let cursor: string | null = null;
    let fetches = 0;

    while (fetches < 20) {
      const q: string = !cursor
        ? `query { boards(ids:[${CONTACTS_BOARD_ID}]) { items_page(limit:500) { cursor items { id column_values(ids:["contact_account"]) { id ... on BoardRelationValue { linked_items { id } } } } } } }`
        : `query { next_items_page(limit:500, cursor:"${cursor}") { cursor items { id column_values(ids:["contact_account"]) { id ... on BoardRelationValue { linked_items { id } } } } } }`;

      const r: Response = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
        body: JSON.stringify({ query: q }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d: any = await r.json();
      const page: { cursor?: string | null; items?: ContactScanItem[] } | undefined =
        !cursor ? d.data?.boards?.[0]?.items_page : d.data?.next_items_page;
      cachedContactScan.push(...(page?.items || []));
      cursor = page?.cursor ?? null;
      if (!cursor) break;
      fetches++;
    }
  }

  return cachedContactScan
    .filter(c => c.column_values[0]?.linked_items?.some(li => li.id === accountId))
    .map(c => c.id);
}

async function setContactAccountLink(apiKey: string, contactId: string, accountId: string) {
  const valueJson = JSON.stringify({ item_ids: [parseInt(accountId, 10)] });
  const escapedValue = JSON.stringify(valueJson);
  const query = `mutation { change_column_value(item_id: ${contactId}, board_id: ${CONTACTS_BOARD_ID}, column_id: "contact_account", value: ${escapedValue}) { id } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
}

async function archiveItem(apiKey: string, itemId: string) {
  const query = `mutation { archive_item(item_id: ${itemId}) { id } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  // Reset request-scoped cache
  cachedContactScan = null;

  const body: ApplyBody = await request.json();
  const log: string[] = [];
  let renamedCount = 0;
  let mergedCount = 0;
  let contactsMoved = 0;
  let archivedCount = 0;
  let errors = 0;

  // Apply renames
  for (const rename of body.renames || []) {
    try {
      await changeItemName(apiKey, rename.id, rename.newName);
      log.push(`✓ Renamed ${rename.id} → "${rename.newName}"`);
      renamedCount++;
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      log.push(`✗ FAILED rename ${rename.id}: ${e instanceof Error ? e.message : String(e)}`);
      errors++;
    }
  }

  // Pre-fetch contacts scan once if we have merges
  if ((body.merges || []).length > 0) {
    log.push("Scanning contacts board for account links...");
    await getContactsLinkedFast(apiKey, "__warmup__");
    const scanCount = (cachedContactScan as ContactScanItem[] | null)?.length ?? 0;
    log.push(`Contacts scan complete (${scanCount} contacts loaded)`);
  }

  // Apply merges
  for (const merge of body.merges || []) {
    try {
      log.push(`Merging ${merge.duplicateIds.length} duplicate(s) into ${merge.canonicalId}`);

      for (const dupId of merge.duplicateIds) {
        const linkedContacts = await getContactsLinkedFast(apiKey, dupId);
        log.push(`  Duplicate ${dupId}: ${linkedContacts.length} contacts to move`);

        for (const contactId of linkedContacts) {
          try {
            await setContactAccountLink(apiKey, contactId, merge.canonicalId);
            contactsMoved++;
            await new Promise(r => setTimeout(r, 100));
          } catch (e) {
            log.push(`  ✗ FAILED move contact ${contactId}: ${e instanceof Error ? e.message : String(e)}`);
            errors++;
          }
        }

        try {
          await archiveItem(apiKey, dupId);
          archivedCount++;
          log.push(`  ✓ Archived duplicate ${dupId}`);
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          log.push(`  ✗ FAILED archive ${dupId}: ${e instanceof Error ? e.message : String(e)}`);
          errors++;
        }
      }

      mergedCount++;
    } catch (e) {
      log.push(`✗ FAILED merge ${merge.canonicalId}: ${e instanceof Error ? e.message : String(e)}`);
      errors++;
    }
  }

  console.log("[cleanup-apply] DONE", { renamedCount, mergedCount, contactsMoved, archivedCount, errors });
  return NextResponse.json({
    summary: { renamedCount, mergedCount, contactsMoved, archivedCount, errors },
    log,
  });
}
