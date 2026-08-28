import { NextResponse } from "next/server";
import { google } from "googleapis";
import {
  ROSTER,
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

async function fetchLiveStatuses(key: string, calendarId: string): Promise<OfficeStatusPayload> {
  const credentials = JSON.parse(Buffer.from(key, "base64").toString("utf8"));
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const res = await calendar.events.list({
    calendarId,
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  const events: CalendarEventInput[] = (res.data.items ?? [])
    .map(item => {
      const isAllDay = !!item.start?.date && !item.start?.dateTime;
      const start = new Date(item.start?.dateTime ?? item.start?.date ?? 0);
      const end = new Date(item.end?.dateTime ?? item.end?.date ?? 0);
      return { title: item.summary ?? "", isAllDay, start, end };
    })
    .filter(event => event.title.length > 0);

  return { source: "live", statuses: resolveStatuses(events, ROSTER, now) };
}

export async function GET() {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.payload);
  }

  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const calendarId = process.env.PRACTICE_CALENDAR_ID;

  if (key && calendarId) {
    try {
      const payload = await fetchLiveStatuses(key, calendarId);
      cached = { at: Date.now(), payload };
      return NextResponse.json(payload);
    } catch (error) {
      if (!warnedFailure) {
        warnedFailure = true;
        console.warn(
          "office-status: Google Calendar fetch failed, serving placeholder data:",
          error instanceof Error ? error.message : error,
        );
      }
      return NextResponse.json(placeholderPayload());
    }
  }

  if (!warnedPlaceholder) {
    warnedPlaceholder = true;
    console.warn(
      "office-status: GOOGLE_SERVICE_ACCOUNT_KEY / PRACTICE_CALENDAR_ID not set — serving placeholder statuses",
    );
  }
  return NextResponse.json(placeholderPayload());
}
