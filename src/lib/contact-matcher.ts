import type { CalendarAttendee } from "./google-calendar";

export interface CRMContact {
  id: string;
  name: string;
  nameLower: string;
  email: string | null;
  emailLower: string | null;
  domain: string | null;
}

export interface MatchResult {
  contactId: string;
  contactName: string;
  tier: 1 | 2 | 3;
  inferredEmail: string | null;
}

export class ContactIndex {
  byEmail = new Map<string, CRMContact>();
  byName = new Map<string, CRMContact[]>();
  all: CRMContact[] = [];

  get size() {
    return this.all.length;
  }

  add(c: CRMContact) {
    this.all.push(c);
    if (c.emailLower) this.byEmail.set(c.emailLower, c);
    if (c.nameLower) {
      const bucket = this.byName.get(c.nameLower) ?? [];
      bucket.push(c);
      this.byName.set(c.nameLower, bucket);
    }
  }

  getById(id: string): CRMContact | undefined {
    return this.all.find(c => c.id === id);
  }
}

type MondayItem = {
  id: string;
  name: string;
  column_values: { id: string; text: string }[];
};

type MondayPage = { cursor?: string | null; items?: MondayItem[] };

type MondayResponse = {
  data?: {
    boards?: [{ items_page: MondayPage }];
    next_items_page?: MondayPage;
  };
};

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function cleanDomain(raw: string): string {
  let d = raw.trim();
  if (d.includes(" - ")) d = d.split(" - ")[0].trim();
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
}

export async function buildContactIndex(): Promise<ContactIndex> {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) throw new Error("Missing MONDAY_API_KEY");

  const index = new ContactIndex();
  let cursor: string | null = null;
  let fetches = 0;

  while (fetches < 20) {
    const query = !cursor
      ? `query { boards(ids:[1461714569]) { items_page(limit:500) { cursor items { id name column_values(ids:["contact_email","text_mm2563nr"]) { id text } } } } }`
      : `query { next_items_page(limit:500, cursor:"${cursor}") { cursor items { id name column_values(ids:["contact_email","text_mm2563nr"]) { id text } } } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
        "API-Version": "2024-01",
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`Monday.com API ${res.status}`);
    const data = (await res.json()) as MondayResponse;

    const page: MondayPage | undefined = !cursor
      ? data.data?.boards?.[0]?.items_page
      : data.data?.next_items_page;
    for (const item of page?.items ?? []) {
      const emailRaw = item.column_values.find(c => c.id === "contact_email")?.text?.trim() ?? "";
      const domainRaw = item.column_values.find(c => c.id === "text_mm2563nr")?.text?.trim() ?? "";
      index.add({
        id: item.id,
        name: item.name,
        nameLower: normalizeName(item.name),
        email: emailRaw || null,
        emailLower: emailRaw ? emailRaw.toLowerCase() : null,
        domain: domainRaw ? cleanDomain(domainRaw) : null,
      });
    }

    cursor = page?.cursor ?? null;
    if (!cursor) break;
    fetches++;
  }

  return index;
}

export function matchAttendee(
  attendee: CalendarAttendee,
  index: ContactIndex,
): MatchResult | null {
  const emailLower = attendee.email.toLowerCase();
  const nameLower = attendee.displayName ? normalizeName(attendee.displayName) : null;
  const attendeeDomain = emailLower.includes("@") ? emailLower.split("@")[1] : null;

  // Tier 1: email exact match
  const byEmail = index.byEmail.get(emailLower);
  if (byEmail) {
    return { contactId: byEmail.id, contactName: byEmail.name, tier: 1, inferredEmail: null };
  }

  if (!nameLower) return null;
  const candidates = index.byName.get(nameLower) ?? [];

  // Tier 2: name + attendee email domain matches contact company domain
  if (attendeeDomain && candidates.length > 0) {
    for (const c of candidates) {
      if (c.domain && c.domain === attendeeDomain) {
        return {
          contactId: c.id,
          contactName: c.name,
          tier: 2,
          inferredEmail: c.email ? null : attendee.email,
        };
      }
    }
  }

  // Tier 3: name only — only when exactly one candidate to avoid false positives
  if (candidates.length === 1) {
    return {
      contactId: candidates[0].id,
      contactName: candidates[0].name,
      tier: 3,
      inferredEmail: candidates[0].email ? null : attendee.email,
    };
  }

  return null;
}
