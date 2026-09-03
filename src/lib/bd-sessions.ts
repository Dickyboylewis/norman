import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type BdSessionType = "core" | "stretch" | "bd500";
export type BdDirectorName = "Joe Haire" | "Jesus Jimenez" | "Dicky Lewis";

export interface BdSession {
  id: string;
  name: BdDirectorName;
  type: BdSessionType;
  startedAt: string;
  endsAt: string;
  completedAt: string | null;
}

export const BD_SESSION_TYPES: BdSessionType[] = ["core", "stretch", "bd500"];

export const BD_DIRECTOR_NAMES: BdDirectorName[] = [
  "Joe Haire",
  "Jesus Jimenez",
  "Dicky Lewis",
];

/** Google account email to display name, matching the names /api/monday returns. */
const BD_NAME_BY_EMAIL: Record<string, BdDirectorName> = {
  "dicky.lewis@white-red.co.uk": "Dicky Lewis",
  "jesus.jimenez@white-red.co.uk": "Jesus Jimenez",
  "joe.haire@white-red.co.uk": "Joe Haire",
};

export function bdNameForEmail(email: string): BdDirectorName | null {
  return BD_NAME_BY_EMAIL[email.toLowerCase()] ?? null;
}

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "bd-sessions.json");

function readSessions(): BdSession[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as BdSession[]) : [];
  } catch {
    writeSessions([]);
    return [];
  }
}

function writeSessions(sessions: BdSession[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${SESSIONS_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(sessions, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, SESSIONS_FILE);
}

/** Europe/London's UTC offset at a given instant, in milliseconds. */
function londonOffsetMs(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - at.getTime();
}

/** The instant of Monday 00:00 Europe/London in the current week. */
export function startOfCurrentWeekLondon(): Date {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const daysBack = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
    String(parts.weekday),
  );
  const monday = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - daysBack, 12),
  );
  const midnightUtcGuess = Date.UTC(
    monday.getUTCFullYear(),
    monday.getUTCMonth(),
    monday.getUTCDate(),
  );
  return new Date(midnightUtcGuess - londonOffsetMs(new Date(midnightUtcGuess)));
}

export function getSessionsForCurrentWeek(): BdSession[] {
  const weekStart = startOfCurrentWeekLondon().getTime();
  return readSessions().filter((s) => {
    const started = Date.parse(s.startedAt);
    return Number.isFinite(started) && started >= weekStart;
  });
}

export function startSession(
  name: BdDirectorName,
  type: BdSessionType,
  durationMinutes: number,
): BdSession {
  const sessions = readSessions();
  const startedAt = new Date();
  const record: BdSession = {
    id: randomUUID(),
    name,
    type,
    startedAt: startedAt.toISOString(),
    endsAt: new Date(startedAt.getTime() + durationMinutes * 60_000).toISOString(),
    completedAt: null,
  };
  sessions.push(record);
  writeSessions(sessions);
  return record;
}

export function completeSession(id: string): BdSession | null {
  const sessions = readSessions();
  const record = sessions.find((s) => s.id === id);
  if (!record) return null;
  record.completedAt = new Date().toISOString();
  writeSessions(sessions);
  return record;
}
