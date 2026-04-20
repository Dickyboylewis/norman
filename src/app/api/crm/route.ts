import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * CRM Neural Map API Route
 *
 * Fetches contacts and accounts from Monday.com and returns structured JSON
 * for the CRM Neural Map visualization.
 *
 * BOARDS:
 *   - Contacts: 1461714569
 *   - Accounts: 1461714573
 */

interface MondayColumnValue {
  id: string;
  text: string;
  value: string;
}

interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

interface Contact {
  id: string;
  name: string;
  contactType: string;
  directors: string[];
  company: string;
  companyDomain: string;
  position: string;
  email: string;
  phone: string;
  linkedIn: string;
  lastContacted: string;
  firstMet: string;
  followUpDate: string;
  notes: string;
  sector: string;
  location: string;
  priority: string;
  connectedToIds: string[];
  referredByIds: string[];
  accountIds: string[];
}

interface Account {
  id: string;
  name: string;
  domain: string;
  type: string;
  owner: string;
  priority: string;
}

interface Connection {
  from: string;
  to: string;
}

interface Stats {
  totalContacts: number;
  totalAccounts: number;
  totalConnections: number;
  contactsWithEmail: number;
  contactsWithLastContacted: number;
  contactsWithConnections: number;
}

export async function GET() {
  const apiKey = process.env.MONDAY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing MONDAY_API_KEY" }, { status: 500 });
  }

  try {
    // ── STEP 1: Fetch all contacts from Contacts board ──────────────────────
    const contacts = await fetchAllItems(apiKey, 1461714569);

    // ── STEP 2: Fetch all accounts from Accounts board ──────────────────────
    const accounts = await fetchAllItems(apiKey, 1461714573);

    // ── STEP 3: Transform the raw Monday.com data ────────────────────────────
    const transformedContacts = contacts.map(transformContact);
    const transformedAccounts = accounts.map(transformAccount);

    // ── STEP 4: Build the connections array ──────────────────────────────────
    const connections = buildConnections(transformedContacts);

    // ── STEP 5: Calculate stats ──────────────────────────────────────────────
    const stats: Stats = {
      totalContacts: transformedContacts.length,
      totalAccounts: transformedAccounts.length,
      totalConnections: connections.length,
      contactsWithEmail: transformedContacts.filter(c => c.email).length,
      contactsWithLastContacted: transformedContacts.filter(c => c.lastContacted).length,
      contactsWithConnections: transformedContacts.filter(c => c.connectedToIds.length > 0).length,
    };

    return NextResponse.json({
      contacts: transformedContacts,
      accounts: transformedAccounts,
      connections,
      stats,
    });

  } catch (error) {
    console.error("[CRM API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch CRM data" },
      { status: 500 }
    );
  }
}

/**
 * Fetch all items from a Monday.com board using cursor-based pagination
 */
async function fetchAllItems(apiKey: string, boardId: number): Promise<MondayItem[]> {
  let allItems: MondayItem[] = [];
  let currentCursor: string | null = null;
  let hasMore = true;
  let fetchCount = 0;
  const maxFetches = 20; // Safety limit

  while (hasMore && fetchCount < maxFetches) {
    let query = "";

    if (!currentCursor) {
      // First request
      query = `
        query {
          boards(ids: [${boardId}]) {
            items_page(limit: 500) {
              cursor
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `;
    } else {
      // Subsequent requests
      query = `
        query {
          next_items_page(limit: 500, cursor: "${currentCursor}") {
            cursor
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      `;
    }

    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Monday.com API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Monday.com GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    let itemsBatch: MondayItem[] = [];
    if (!currentCursor) {
      itemsBatch = data.data?.boards?.[0]?.items_page?.items || [];
      currentCursor = data.data?.boards?.[0]?.items_page?.cursor ?? null;
    } else {
      itemsBatch = data.data?.next_items_page?.items || [];
      currentCursor = data.data?.next_items_page?.cursor ?? null;
    }

    allItems = allItems.concat(itemsBatch);

    if (!currentCursor) {
      hasMore = false;
    }
    fetchCount++;
  }

  return allItems;
}

/**
 * Get column value by ID
 */
function getColumnValue(item: MondayItem, columnId: string): string {
  const column = item.column_values.find(c => c.id === columnId);
  return column?.text || "";
}

/**
 * Parse board relation column (returns array of linked item IDs)
 */
function parseBoardRelation(item: MondayItem, columnId: string): string[] {
  const column = item.column_values.find(c => c.id === columnId);
  if (!column?.value) return [];

  try {
    const parsed = JSON.parse(column.value);
    if (parsed.linkedPulseIds && Array.isArray(parsed.linkedPulseIds)) {
      return parsed.linkedPulseIds.map((item: any) => String(item.linkedPulseId));
    }
  } catch (e) {
    // Invalid JSON, return empty array
  }

  return [];
}

/**
 * Parse directors from people column
 * Maps "Joe Haire" → "joe", "Jesus Jimenez" → "jesus", "Dicky Lewis" → "dicky"
 */
function parseDirectors(text: string): string[] {
  if (!text) return [];

  const nameMap: Record<string, string> = {
    "Joe Haire": "joe",
    "Jesus Jimenez": "jesus",
    "Dicky Lewis": "dicky",
  };

  return text
    .split(/[,\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(name => nameMap[name] || name.toLowerCase().split(" ")[0])
    .filter(Boolean);
}

/**
 * Transform a Monday.com contact item into our Contact structure
 */
function transformContact(item: MondayItem): Contact {
  // Contact Type: prefer "status" column, fallback to "text_mm25bn2f"
  const statusContactType = getColumnValue(item, "status");
  const textContactType = getColumnValue(item, "text_mm25bn2f");
  const contactType = statusContactType || textContactType;

  // Directors from people column
  const directorsText = getColumnValue(item, "people__1");
  const directors = parseDirectors(directorsText);

  return {
    id: item.id,
    name: item.name,
    contactType,
    directors,
    company: getColumnValue(item, "text8"),
    companyDomain: getColumnValue(item, "text_mm2563nr"),
    position: getColumnValue(item, "text_mm25ab00"),
    email: getColumnValue(item, "contact_email"),
    phone: getColumnValue(item, "contact_phone"),
    linkedIn: getColumnValue(item, "text_mm255n59"),
    lastContacted: getColumnValue(item, "date_mm25bz34"),
    firstMet: getColumnValue(item, "text_mm25j4tc"),
    followUpDate: getColumnValue(item, "date_mm25jbnm"),
    notes: getColumnValue(item, "long_text4"),
    sector: getColumnValue(item, "dropdown_mm25y90m"),
    location: getColumnValue(item, "text_mm25jgvd"),
    priority: getColumnValue(item, "status5"),
    connectedToIds: parseBoardRelation(item, "board_relation_mm25s0kr"),
    referredByIds: parseBoardRelation(item, "board_relation_mm25jb55"),
    accountIds: parseBoardRelation(item, "contact_account"),
  };
}

/**
 * Transform a Monday.com account item into our Account structure
 */
function transformAccount(item: MondayItem): Account {
  // Domain might be in format "domain.com - https://domain.com"
  // Extract just the domain before " - " if that pattern exists
  let domain = getColumnValue(item, "company_domain");
  if (domain.includes(" - ")) {
    domain = domain.split(" - ")[0].trim();
  }

  return {
    id: item.id,
    name: item.name,
    domain,
    type: getColumnValue(item, "status"),
    owner: getColumnValue(item, "people__1"),
    priority: getColumnValue(item, "status5"),
  };
}

/**
 * Build connections array from connectedToIds
 * Deduplicate so each pair only appears once
 */
function buildConnections(contacts: Contact[]): Connection[] {
  const connectionSet = new Set<string>();
  const connections: Connection[] = [];

  contacts.forEach(contact => {
    contact.connectedToIds.forEach(connectedId => {
      // Create a normalized key (always sort IDs alphabetically to avoid duplicates)
      const key = [contact.id, connectedId].sort().join(":");

      if (!connectionSet.has(key)) {
        connectionSet.add(key);
        connections.push({
          from: contact.id,
          to: connectedId,
        });
      }
    });
  });

  return connections;
}
