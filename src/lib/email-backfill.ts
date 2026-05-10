import fs from "fs";
import path from "path";

const DATA_DIR = "/data/relationship-intel";
const FILE = path.join(DATA_DIR, "email-backfill.json");
const MONDAY_API = "https://api.monday.com/v2";
const CONTACTS_BOARD = 1461714569;

export interface BackfillEntry {
  contactId: string;
  contactName: string;
  proposedEmail: string;
  source: string;
  confidence: "high" | "medium" | "low";
  addedAt: string;
  status: "pending" | "applied" | "rejected" | "dry-run";
  appliedAt?: string;
  decidedBy?: string;
}

function readFile(): BackfillEntry[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as BackfillEntry[];
  } catch {
    return [];
  }
}

function writeFile(data: BackfillEntry[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

export function addToBackfillQueue(params: {
  contactId: string;
  contactName: string;
  proposedEmail: string;
  source: string;
  confidence: "high" | "medium" | "low";
  dryRun: boolean;
}): void {
  const entries = readFile();
  const already = entries.find(
    e => e.contactId === params.contactId && e.proposedEmail === params.proposedEmail,
  );
  if (already) return;

  entries.push({
    contactId: params.contactId,
    contactName: params.contactName,
    proposedEmail: params.proposedEmail,
    source: params.source,
    confidence: params.confidence,
    addedAt: new Date().toISOString(),
    status: params.dryRun ? "dry-run" : "pending",
  });
  writeFile(entries);
}

export async function processBackfillQueue(
  dryRun: boolean,
): Promise<{ applied: number; skipped: number }> {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return { applied: 0, skipped: 0 };

  const entries = readFile();
  const pending = entries.filter(e => e.status === "pending" && e.confidence !== "low");

  let applied = 0;
  let skipped = 0;

  for (const entry of pending) {
    if (dryRun) {
      console.log(
        `[email-backfill dry-run] Would write ${entry.proposedEmail} → contact ${entry.contactId} (${entry.contactName})`,
      );
      entry.status = "dry-run";
      skipped++;
      continue;
    }

    try {
      const emailValue = JSON.stringify({ email: entry.proposedEmail, text: entry.proposedEmail });
      const mutation = `mutation {
        change_column_value(
          item_id: ${entry.contactId},
          board_id: ${CONTACTS_BOARD},
          column_id: "contact_email",
          value: ${JSON.stringify(emailValue)}
        ) { id }
      }`;
      const res = await fetch(MONDAY_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
          "API-Version": "2024-01",
        },
        body: JSON.stringify({ query: mutation }),
      });
      if (res.ok) {
        entry.status = "applied";
        applied++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  writeFile(entries);
  return { applied, skipped };
}

export function getBackfillEntries(): BackfillEntry[] {
  return readFile();
}

export function updateBackfillStatus(
  contactId: string,
  action: "approved" | "rejected",
  chosenEmail: string | null,
  decidedBy: string,
): BackfillEntry[] {
  const entries = readFile();
  const forContact = entries.filter(e => e.contactId === contactId);
  if (forContact.length === 0) return [];

  const now = new Date().toISOString();

  for (const entry of entries) {
    if (entry.contactId !== contactId) continue;
    if (action === "rejected") {
      if (entry.status === "pending" || entry.status === "dry-run") {
        entry.status = "rejected";
        entry.decidedBy = decidedBy;
      }
    } else {
      // approved: mark chosen as applied, all others rejected
      if (chosenEmail === null || entry.proposedEmail === chosenEmail) {
        if (entry.status !== "applied") {
          entry.status = "applied";
          entry.appliedAt = now;
          entry.decidedBy = decidedBy;
        }
      } else {
        if (entry.status === "pending" || entry.status === "dry-run") {
          entry.status = "rejected";
          entry.decidedBy = decidedBy;
        }
      }
    }
  }

  writeFile(entries);
  return entries.filter(e => e.contactId === contactId);
}
