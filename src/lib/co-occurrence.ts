import fs from "fs";
import path from "path";

const DATA_DIR = "/data/relationship-intel";
const FILE = path.join(DATA_DIR, "co-occurrences.json");

interface CoEntry {
  count: number;
  lastSeen: string;
  directors: string[];
}

export type CoData = Record<string, CoEntry>;

function readFile(): CoData {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as CoData;
  } catch {
    return {};
  }
}

function writeFile(data: CoData): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

export function recordCoOccurrences(
  contactIds: string[],
  directorName: string,
  eventDate: string,
): void {
  if (contactIds.length < 2) return;
  const data = readFile();

  for (let i = 0; i < contactIds.length; i++) {
    for (let j = i + 1; j < contactIds.length; j++) {
      const key = [contactIds[i], contactIds[j]].sort().join("|");
      const entry: CoEntry = data[key] ?? { count: 0, lastSeen: eventDate, directors: [] };
      entry.count++;
      if (new Date(eventDate) > new Date(entry.lastSeen)) entry.lastSeen = eventDate;
      if (!entry.directors.includes(directorName)) entry.directors.push(directorName);
      data[key] = entry;
    }
  }

  writeFile(data);
}

export function getCoOccurrences(): CoData {
  return readFile();
}
