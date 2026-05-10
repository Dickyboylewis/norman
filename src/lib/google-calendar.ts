import { refreshAccessTokenIfNeeded, getTokens, updateSyncState } from "./calendar-tokens";

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  self?: boolean;
  responseStatus?: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: CalendarAttendee[];
  organizer?: { email?: string; displayName?: string };
  status?: string;
}

export interface FetchEventsResult {
  events: CalendarEvent[];
  nextSyncToken: string | null;
}

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

type PageResult = {
  items?: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

async function fetchPage(accessToken: string, params: URLSearchParams): Promise<PageResult> {
  const res = await fetch(`${CALENDAR_API}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Calendar API ${res.status}: ${text}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<PageResult>;
}

export async function fetchEventsForDirector(directorName: string): Promise<FetchEventsResult> {
  const accessTokenOrNull = await refreshAccessTokenIfNeeded(directorName);
  if (!accessTokenOrNull) throw new Error(`No valid access token for ${directorName}`);
  const accessToken: string = accessTokenOrNull;

  const tokenData = getTokens(directorName);
  const syncToken = tokenData?.calendarSyncToken ?? null;

  const allEvents: CalendarEvent[] = [];
  let nextSyncToken: string | null = null;

  async function runFetch(useSyncToken: boolean): Promise<void> {
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ maxResults: "250", singleEvents: "true" });
      if (useSyncToken && syncToken) {
        params.set("syncToken", syncToken as string);
      } else {
        params.set("timeMin", new Date(Date.now() - NINETY_DAYS_MS).toISOString());
        params.set("orderBy", "startTime");
      }
      if (pageToken) params.set("pageToken", pageToken);

      let page: PageResult;
      try {
        page = await fetchPage(accessToken, params);
      } catch (err) {
        if ((err as Error & { status?: number }).status === 410 && useSyncToken) {
          updateSyncState(directorName, {
            lastSyncAt: tokenData?.lastSyncAt ?? null,
            calendarSyncToken: null,
          });
          allEvents.length = 0;
          await runFetch(false);
          return;
        }
        throw err;
      }

      for (const event of page.items ?? []) {
        if (event.status === "cancelled") continue;
        if (!event.start?.dateTime) continue; // skip all-day events
        if ((event.attendees?.length ?? 0) <= 1) continue;
        allEvents.push(event);
      }

      nextSyncToken = page.nextSyncToken ?? null;
      pageToken = page.nextPageToken;
    } while (pageToken);
  }

  await runFetch(!!syncToken);
  return { events: allEvents, nextSyncToken };
}
