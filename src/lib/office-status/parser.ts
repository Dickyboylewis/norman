/**
 * Pure parser for practice-calendar status events. No I/O — unit-testable.
 *
 * Real title formats handled: "Jonathan Hol", "Dicky hol", "Joe - Holiday",
 * "Jesus holidays", "Artem WFH", "Tino Hol PM", "Jonathan WFH AM",
 * "Hope WFH AM/Hol PM", "KG DL catchup" (timed), "Alex 1st Day" (no status).
 */

export type OfficeStatus = "holiday" | "sick" | "home" | "site" | "meeting";

export interface RosterEntry {
  personId: string;
  fullName: string;
  firstName: string;
  initials: string;
}

/**
 * Hand-editable roster. personId values match data/office-layout.json people.
 */
export const ROSTER: RosterEntry[] = [
  { personId: "kit", fullName: "Kit Gunaratne", firstName: "Kit", initials: "KG" },
  { personId: "alice", fullName: "Alice Holmes", firstName: "Alice", initials: "AH" },
  { personId: "dani", fullName: "Dani Reed", firstName: "Dani", initials: "DR" },
  { personId: "josh", fullName: "Joshua Hunt", firstName: "Josh", initials: "JH" },
  { personId: "jess", fullName: "Jess Watling", firstName: "Jess", initials: "JW" },
  { personId: "euan", fullName: "Euan Christie", firstName: "Euan", initials: "EC" },
  { personId: "tino", fullName: "Tino Baranda", firstName: "Tino", initials: "TB" },
  { personId: "jasmine", fullName: "Jasmine Hounslow", firstName: "Jasmine", initials: "JHo" },
  { personId: "francesc", fullName: "Francesc Montosa", firstName: "Francesc", initials: "FM" },
  { personId: "jules", fullName: "Jules Byers", firstName: "Jules", initials: "JB" },
  { personId: "dilan", fullName: "Dilan Savage", firstName: "Dilan", initials: "DS" },
  { personId: "miles", fullName: "Miles Reay-Palmer", firstName: "Miles", initials: "MRP" },
  { personId: "hope", fullName: "Hope Glover", firstName: "Hope", initials: "HG" },
  { personId: "riley", fullName: "Riley Adams-Winch", firstName: "Riley", initials: "RAW" },
  { personId: "jonathan", fullName: "Jonathan Spratt", firstName: "Jonathan", initials: "JS" },
  { personId: "michael", fullName: "Michael Bridgeman", firstName: "Michael", initials: "MB" },
  { personId: "paloma", fullName: "Paloma Quintana", firstName: "Paloma", initials: "PQ" },
  { personId: "james", fullName: "James Bubaris", firstName: "James", initials: "JBu" },
  { personId: "joe", fullName: "Joe Haire", firstName: "Joe", initials: "JHa" },
  { personId: "artem", fullName: "Artem", firstName: "Artem", initials: "A" },
  { personId: "josephine", fullName: "Josephine", firstName: "Josephine", initials: "JF" },
  { personId: "katy", fullName: "Katy Binks", firstName: "Katy", initials: "KB" },
  { personId: "dicky", fullName: "Dicky Lewis", firstName: "Dicky", initials: "DL" },
  { personId: "jesus", fullName: "Jesus Jimenez", firstName: "Jesus", initials: "JJ" },
];

export interface ParsedStatus {
  personId: string;
  status: OfficeStatus;
  windowStart: Date;
  windowEnd: Date;
}

export interface CalendarEventInput {
  title: string;
  isAllDay: boolean;
  start: Date;
  end: Date;
}

const WORK_START_HOUR = 8;
const MIDDAY_HOUR = 13;
const WORK_END_HOUR = 18;

const STATUS_PRIORITY: OfficeStatus[] = ["sick", "holiday", "site", "home", "meeting"];

const HOLIDAY_WORDS = new Set(["hol", "holiday", "holidays", "leave", "al", "off"]);
const SICK_WORDS = new Set(["sick", "ill", "unwell"]);
const HOME_WORDS = new Set(["wfh", "home"]);
const SITE_WORDS = new Set(["site"]);

function words(text: string): string[] {
  return text.split(/[^a-zA-Z0-9']+/).filter(Boolean);
}

function dayAt(base: Date, hour: number): Date {
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Identify roster people mentioned in a text segment. Case-insensitive.
 * Priority: full-name phrase, then whole-word initials, then whole-word first
 * name — a first name shared by several people only matches when the segment
 * also carries a disambiguating surname or initials; otherwise it is skipped.
 */
export function matchPeople(segment: string, roster: RosterEntry[]): RosterEntry[] {
  const lower = segment.toLowerCase();
  const tokens = words(lower);
  const tokenSet = new Set(tokens);
  const matched = new Map<string, RosterEntry>();

  for (const entry of roster) {
    if (lower.includes(entry.fullName.toLowerCase())) {
      matched.set(entry.personId, entry);
    }
  }

  for (const entry of roster) {
    const initialsLower = entry.initials.toLowerCase();
    if (!tokenSet.has(initialsLower)) continue;
    const shared = roster.filter(r => r.initials.toLowerCase() === initialsLower);
    if (shared.length === 1) matched.set(entry.personId, entry);
  }

  for (const entry of roster) {
    const first = entry.firstName.toLowerCase();
    if (!tokenSet.has(first)) continue;
    const shared = roster.filter(r => r.firstName.toLowerCase() === first);
    if (shared.length === 1) {
      matched.set(entry.personId, entry);
      continue;
    }
    const surname = entry.fullName.toLowerCase().split(/\s+/).slice(1).join(" ");
    const hasSurname = surname.length > 0 && lower.includes(surname);
    const hasInitials = tokenSet.has(entry.initials.toLowerCase());
    if (hasSurname || hasInitials) matched.set(entry.personId, entry);
  }

  return [...matched.values()];
}

function statusKeyword(segment: string): OfficeStatus | null {
  const tokens = words(segment.toLowerCase());
  for (const token of tokens) {
    if (SICK_WORDS.has(token)) return "sick";
    if (HOLIDAY_WORDS.has(token)) return "holiday";
    if (HOME_WORDS.has(token)) return "home";
    if (SITE_WORDS.has(token)) return "site";
  }
  if (/\bannual leave\b/i.test(segment)) return "holiday";
  if (/\bworking from home\b/i.test(segment)) return "home";
  if (/\bsite visit\b/i.test(segment)) return "site";
  return null;
}

function halfDayWindow(segment: string, day: Date): { start: Date; end: Date } {
  const tokens = new Set(words(segment.toLowerCase()));
  if (tokens.has("am") && !tokens.has("pm")) {
    return { start: dayAt(day, WORK_START_HOUR), end: dayAt(day, MIDDAY_HOUR) };
  }
  if (tokens.has("pm") && !tokens.has("am")) {
    return { start: dayAt(day, MIDDAY_HOUR), end: dayAt(day, WORK_END_HOUR) };
  }
  return { start: dayAt(day, WORK_START_HOUR), end: dayAt(day, WORK_END_HOUR) };
}

export function parseEvent(
  title: string,
  isAllDay: boolean,
  start: Date,
  end: Date,
  roster: RosterEntry[],
): ParsedStatus[] {
  const trimmed = title.trim();
  if (!trimmed) return [];

  if (!isAllDay) {
    const people = matchPeople(trimmed, roster);
    if (people.length === 0) return [];
    const keyword = statusKeyword(trimmed);
    const status: OfficeStatus = keyword === "site" ? "site" : "meeting";
    return people.map(person => ({
      personId: person.personId,
      status,
      windowStart: start,
      windowEnd: end,
    }));
  }

  const results: ParsedStatus[] = [];
  let carriedPeople: RosterEntry[] = [];
  for (const segment of trimmed.split("/")) {
    const people = matchPeople(segment, roster);
    const effectivePeople = people.length > 0 ? people : carriedPeople;
    if (people.length > 0) carriedPeople = people;
    if (effectivePeople.length === 0) continue;

    const keyword = statusKeyword(segment);
    if (!keyword) continue;

    const window = halfDayWindow(segment, start);
    for (const person of effectivePeople) {
      results.push({
        personId: person.personId,
        status: keyword,
        windowStart: window.start,
        windowEnd: window.end,
      });
    }
  }
  return results;
}

export interface ResolvedStatus {
  personId: string;
  status: OfficeStatus | "none";
}

export function resolveStatuses(
  events: CalendarEventInput[],
  roster: RosterEntry[],
  now: Date,
): ResolvedStatus[] {
  const active = new Map<string, OfficeStatus>();

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  for (const event of events) {
    // Google all-day events carry an EXCLUSIVE end date, and a multi-day
    // event that started before today must still cover today — so re-anchor
    // its working-day windows to now's day whenever the span includes now.
    const anchored =
      event.isAllDay && event.start <= now && now < event.end
        ? { ...event, start: dayStart }
        : event;
    for (const parsed of parseEvent(anchored.title, anchored.isAllDay, anchored.start, anchored.end, roster)) {
      if (now < parsed.windowStart || now >= parsed.windowEnd) continue;
      const current = active.get(parsed.personId);
      if (
        current === undefined ||
        STATUS_PRIORITY.indexOf(parsed.status) < STATUS_PRIORITY.indexOf(current)
      ) {
        active.set(parsed.personId, parsed.status);
      }
    }
  }

  return roster.map(entry => ({
    personId: entry.personId,
    status: active.get(entry.personId) ?? "none",
  }));
}
