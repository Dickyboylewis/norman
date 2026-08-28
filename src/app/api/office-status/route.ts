import { NextResponse } from "next/server";
import { google } from "googleapis";
import {
  ROSTER,
  matchPeople,
  parseEvent,
  resolveStatuses,
  type CalendarEventInput,
  type ResolvedStatus,
} from "@/lib/office-status/parser";

export const dynamic = "force-dynamic";

const CACHE_MS = 5 * 60 * 1000;

interface OfficeStatusPayload {
  source: "live" | "placeholder";
  statuses: ResolvedStatus[];
}

interface RawEvent {
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
}

interface DebugParsedMatch {
  personId: string;
  status: string;
  windowStart: string;
  windowEnd: string;
  coversNow: boolean;
}

interface DebugInfo {
  timeMin: string;
  timeMax: string;
  serverTime: string;
  serverTimeZone: string;
  rawEventCount: number;
  events: RawEvent[];
  parsed: { title: string; matches: DebugParsedMatch[]; reason?: string }[];
  note?: string;
}

let cached: { at: number; payload: OfficeStatusPayload } | null = null;
let warnedPlaceholder = false;
let warnedFailure = false;

function placeholderPayload(): OfficeStatusPayload {
  const sample: Record<string, ResolvedStatus["status"]> = {
    paloma: "holiday",
    francesc: "sick",
    kit: "home",
  };
  return {
    source: "placeholder",
    statuses: ROSTER.map(entry => ({
      personId: entry.personId,
      status: sample[entry.personId] ?? "none",
    })),
  };
}

/** Whole-of-today bounds in Europe/London, as RFC3339 with explicit offset. */
function londonDayBounds(now: Date): { timeMin: string; timeMax: string } {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const probe = new Date(`${day}T12:00:00Z`);
  const londonHour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hour12: false,
    }).format(probe),
    10,
  );
  const offsetHours = londonHour - 12;
  const sign = offsetHours >= 0 ? "+" : "-";
  const offset = `${sign}${String(Math.abs(offsetHours)).padStart(2, "0")}:00`;
  return {
    timeMin: `${day}T00:00:00${offset}`,
    timeMax: `${day}T23:59:59${offset}`,
  };
}

interface LiveResult {
  payload: OfficeStatusPayload;
  raw: RawEvent[];
  events: CalendarEventInput[];
  timeMin: string;
  timeMax: string;
  now: Date;
}

async function fetchLive(key: string, calendarId: string): Promise<LiveResult> {
  const credentials = JSON.parse(Buffer.from(key, "base64").toString("utf8"));
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const { timeMin, timeMax } = londonDayBounds(now);

  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  const raw: RawEvent[] = (res.data.items ?? []).map(item => ({
    title: item.summary ?? "",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    end: item.end?.dateTime ?? item.end?.date ?? "",
    isAllDay: !!item.start?.date && !item.start?.dateTime,
  }));

  const events: CalendarEventInput[] = raw
    .filter(event => event.title.length > 0)
    .map(event => ({
      title: event.title,
      isAllDay: event.isAllDay,
      start: new Date(event.start),
      end: new Date(event.end),
    }));

  return {
    payload: { source: "live", statuses: resolveStatuses(events, ROSTER, now) },
    raw,
    events,
    timeMin,
    timeMax,
    now,
  };
}

function buildDebug(result: LiveResult): DebugInfo {
  const { raw, events, timeMin, timeMax, now } = result;
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const parsed = events.map(event => {
    // Mirror resolveStatuses' multi-day re-anchoring so debug shows the
    // windows actually used.
    const anchored =
      event.isAllDay && event.start <= now && now < event.end
        ? { ...event, start: dayStart }
        : event;
    const statuses = parseEvent(
      anchored.title,
      anchored.isAllDay,
      anchored.start,
      anchored.end,
      ROSTER,
    );
    const matches: DebugParsedMatch[] = statuses.map(s => ({
      personId: s.personId,
      status: s.status,
      windowStart: s.windowStart.toISOString(),
      windowEnd: s.windowEnd.toISOString(),
      coversNow: s.windowStart <= now && now < s.windowEnd,
    }));

    let reason: string | undefined;
    if (matches.length === 0) {
      reason =
        matchPeople(event.title, ROSTER).length === 0
          ? "no person recognised"
          : "no status keyword";
    } else if (!matches.some(m => m.coversNow)) {
      reason = "window not applicable";
    }
    return { title: event.title, matches, reason };
  });

  return {
    timeMin,
    timeMax,
    serverTime: now.toISOString(),
    serverTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    rawEventCount: raw.length,
    events: raw,
    parsed,
  };
}

export async function GET(request: Request) {
  const debug = new URL(request.url).searchParams.get("debug") === "1";

  if (!debug && cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.payload);
  }

  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const calendarId = process.env.PRACTICE_CALENDAR_ID;

  if (key && calendarId) {
    try {
      const result = await fetchLive(key, calendarId);
      cached = { at: Date.now(), payload: result.payload };
      if (debug) {
        return NextResponse.json({ ...result.payload, debug: buildDebug(result) });
      }
      return NextResponse.json(result.payload);
    } catch (error) {
      if (!warnedFailure) {
        warnedFailure = true;
        console.warn(
          "office-status: Google Calendar fetch failed, serving placeholder data:",
          error instanceof Error ? error.message : error,
        );
      }
      const payload = placeholderPayload();
      if (debug) {
        const now = new Date();
        const bounds = londonDayBounds(now);
        return NextResponse.json({
          ...payload,
          debug: {
            ...bounds,
            serverTime: now.toISOString(),
            serverTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            rawEventCount: 0,
            events: [],
            parsed: [],
            note: `Google fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          } satisfies DebugInfo,
        });
      }
      return NextResponse.json(payload);
    }
  }

  if (!warnedPlaceholder) {
    warnedPlaceholder = true;
    console.warn(
      "office-status: GOOGLE_SERVICE_ACCOUNT_KEY / PRACTICE_CALENDAR_ID not set — serving placeholder statuses",
    );
  }
  const payload = placeholderPayload();
  if (debug) {
    const now = new Date();
    const bounds = londonDayBounds(now);
    return NextResponse.json({
      ...payload,
      debug: {
        ...bounds,
        serverTime: now.toISOString(),
        serverTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        rawEventCount: 0,
        events: [],
        parsed: [],
        note: "GOOGLE_SERVICE_ACCOUNT_KEY / PRACTICE_CALENDAR_ID not set — placeholder data",
      } satisfies DebugInfo,
    });
  }
  return NextResponse.json(payload);
}
