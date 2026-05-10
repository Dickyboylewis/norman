import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposals } from "@/lib/connection-proposals";
import { getBackfillEntries } from "@/lib/email-backfill";
import { getCoOccurrences } from "@/lib/co-occurrence";
import type { CoEvent } from "@/lib/co-occurrence";

export const dynamic = "force-dynamic";

// ── Monday contact info fetch ─────────────────────────────────────────────────

interface ContactMeta {
  id: string;
  name: string;
  position: string | null;
  accountId: string | null;
  accountName: string | null;
  accountLogoUrl: string | null;
}

async function fetchContactMeta(contactIds: string[]): Promise<Map<string, ContactMeta>> {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey || contactIds.length === 0) return new Map();

  const idsStr = contactIds.join(",");

  // Step 1: fetch contacts with position + linked account
  const contactQuery = `query {
    items(ids: [${idsStr}]) {
      id
      name
      column_values(ids: ["text_mm25ab00", "contact_account"]) {
        id
        text
        ... on BoardRelationValue { linked_items { id } }
        value
      }
    }
  }`;
  const contactRes = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query: contactQuery }),
  });
  const contactData = await contactRes.json() as {
    data?: { items?: { id: string; name: string; column_values: { id: string; text: string; linked_items?: { id: string }[]; value?: string }[] }[] }
  };

  const contactItems = contactData.data?.items ?? [];
  const accountIdMap = new Map<string, string>(); // contactId → accountId
  const metaMap = new Map<string, ContactMeta>();

  for (const item of contactItems) {
    const posCol = item.column_values.find(c => c.id === "text_mm25ab00");
    const acctCol = item.column_values.find(c => c.id === "contact_account");
    let accountId: string | null = null;

    if (acctCol) {
      if (Array.isArray(acctCol.linked_items) && acctCol.linked_items.length > 0) {
        accountId = acctCol.linked_items[0].id;
      } else if (acctCol.value) {
        try {
          const parsed = JSON.parse(acctCol.value);
          if (Array.isArray(parsed.linkedPulseIds) && parsed.linkedPulseIds.length > 0) {
            accountId = String(parsed.linkedPulseIds[0]?.linkedPulseId ?? parsed.linkedPulseIds[0]);
          } else if (Array.isArray(parsed.item_ids) && parsed.item_ids.length > 0) {
            accountId = String(parsed.item_ids[0]);
          }
        } catch { /* ignore */ }
      }
    }

    if (accountId) accountIdMap.set(item.id, accountId);
    metaMap.set(item.id, {
      id: item.id,
      name: item.name,
      position: posCol?.text || null,
      accountId,
      accountName: null,
      accountLogoUrl: null,
    });
  }

  // Step 2: fetch account names + domains for logo
  const uniqueAccountIds = Array.from(new Set(accountIdMap.values()));
  if (uniqueAccountIds.length > 0) {
    const acctQuery = `query {
      items(ids: [${uniqueAccountIds.join(",")}]) {
        id
        name
        column_values(ids: ["company_domain"]) { id text }
      }
    }`;
    const acctRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query: acctQuery }),
    });
    const acctData = await acctRes.json() as {
      data?: { items?: { id: string; name: string; column_values: { id: string; text: string }[] }[] }
    };
    const accountInfo = new Map<string, { name: string; domain: string }>();
    for (const acct of acctData.data?.items ?? []) {
      const domain = acct.column_values.find(c => c.id === "company_domain")?.text?.trim() ?? "";
      accountInfo.set(acct.id, { name: acct.name, domain });
    }

    // Merge back into metaMap
    for (const [contactId, meta] of metaMap) {
      const accountId = meta.accountId;
      if (accountId) {
        const info = accountInfo.get(accountId);
        if (info) {
          meta.accountName = info.name;
          meta.accountLogoUrl = info.domain ? `/api/logo?domain=${info.domain}` : null;
        }
      }
      metaMap.set(contactId, meta);
    }
  }

  return metaMap;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDirectorFromSource(source: string): string {
  // source format: "calendar:Dicky Lewis:eventId"
  const parts = source.split(":");
  return parts.length >= 2 ? parts[1] : "unknown";
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allProposals = getProposals().filter(p => p.status === "pending");
  const allBackfills = getBackfillEntries().filter(
    e => e.status === "pending" || e.status === "dry-run",
  );
  const coData = getCoOccurrences();

  // Collect all contactIds we need to enrich
  const allContactIds = new Set<string>();
  for (const p of allProposals) {
    allContactIds.add(p.contactId1);
    allContactIds.add(p.contactId2);
  }
  for (const b of allBackfills) {
    allContactIds.add(b.contactId);
  }

  const metaMap = await fetchContactMeta(Array.from(allContactIds));

  // Enrich proposals
  const enrichedProposals = allProposals.map(p => {
    const key = [p.contactId1, p.contactId2].sort().join("|");
    const coEntry = coData[key];
    const events: CoEvent[] = (coEntry?.events ?? []).slice(0, 5);
    return {
      id: p.id,
      contactId1: p.contactId1,
      contactId2: p.contactId2,
      contact1: metaMap.get(p.contactId1) ?? { id: p.contactId1, name: p.contactName1, position: null, accountId: null, accountName: null, accountLogoUrl: null },
      contact2: metaMap.get(p.contactId2) ?? { id: p.contactId2, name: p.contactName2, position: null, accountId: null, accountName: null, accountLogoUrl: null },
      coOccurrenceCount: p.coOccurrenceCount,
      lastSeen: p.lastSeen,
      directors: p.directors,
      status: p.status,
      createdAt: p.createdAt,
      events,
    };
  });

  // Group backfills by contactId
  const backfillGroups = new Map<string, {
    contactId: string;
    contactName: string;
    contact: ContactMeta;
    candidates: { proposedEmail: string; source: string; directorName: string; confidence: "high" | "medium" | "low" }[];
  }>();

  for (const b of allBackfills) {
    if (!backfillGroups.has(b.contactId)) {
      const contact = metaMap.get(b.contactId) ?? {
        id: b.contactId, name: b.contactName, position: null, accountId: null, accountName: null, accountLogoUrl: null,
      };
      backfillGroups.set(b.contactId, {
        contactId: b.contactId,
        contactName: b.contactName,
        contact,
        candidates: [],
      });
    }
    backfillGroups.get(b.contactId)!.candidates.push({
      proposedEmail: b.proposedEmail,
      source: b.source,
      directorName: parseDirectorFromSource(b.source),
      confidence: b.confidence,
    });
  }

  const backfills = Array.from(backfillGroups.values()).map(g => ({
    ...g,
    isMultiCandidate: g.candidates.length > 1,
  }));

  return NextResponse.json({ proposals: enrichedProposals, backfills });
}
