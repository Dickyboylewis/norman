import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getCoOccurrences } from "./co-occurrence";
import type { ContactIndex } from "./contact-matcher";

const DATA_DIR = "/data/relationship-intel";
const FILE = path.join(DATA_DIR, "proposals.json");
const MIN_CO_OCCURRENCES = 2;

export interface ConnectionProposal {
  id: string;
  contactId1: string;
  contactId2: string;
  contactName1: string;
  contactName2: string;
  coOccurrenceCount: number;
  lastSeen: string;
  directors: string[];
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

function readFile(): ConnectionProposal[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as ConnectionProposal[];
  } catch {
    return [];
  }
}

function writeFile(data: ConnectionProposal[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

export function generateProposals(contactIndex: ContactIndex): ConnectionProposal[] {
  const coData = getCoOccurrences();
  const existing = readFile();
  const existingKeys = new Set(existing.map(p => [p.contactId1, p.contactId2].sort().join("|")));

  const newProposals: ConnectionProposal[] = [];

  for (const [key, entry] of Object.entries(coData)) {
    if (entry.count < MIN_CO_OCCURRENCES) continue;

    if (existingKeys.has(key)) {
      // Keep pending proposals up-to-date with latest counts
      const p = existing.find(e => [e.contactId1, e.contactId2].sort().join("|") === key);
      if (p && p.status === "pending") {
        p.coOccurrenceCount = entry.count;
        p.lastSeen = entry.lastSeen;
        p.directors = entry.directors;
      }
      continue;
    }

    const [id1, id2] = key.split("|");
    const c1 = contactIndex.getById(id1);
    const c2 = contactIndex.getById(id2);
    if (!c1 || !c2) continue;

    const proposal: ConnectionProposal = {
      id: crypto.randomUUID(),
      contactId1: id1,
      contactId2: id2,
      contactName1: c1.name,
      contactName2: c2.name,
      coOccurrenceCount: entry.count,
      lastSeen: entry.lastSeen,
      directors: entry.directors,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    newProposals.push(proposal);
    existingKeys.add(key);
  }

  writeFile([...existing, ...newProposals]);
  return newProposals;
}

export function getProposals(): ConnectionProposal[] {
  return readFile();
}
