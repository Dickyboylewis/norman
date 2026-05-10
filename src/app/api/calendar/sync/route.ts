import { NextResponse } from "next/server";
import { DIRECTORS } from "@/lib/directors";
import { fetchEventsForDirector } from "@/lib/google-calendar";
import { buildContactIndex, matchAttendee } from "@/lib/contact-matcher";
import { recordCoOccurrences } from "@/lib/co-occurrence";
import { addToBackfillQueue, processBackfillQueue } from "@/lib/email-backfill";
import { generateProposals } from "@/lib/connection-proposals";
import { updateSyncState } from "@/lib/calendar-tokens";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (!process.env.CALENDAR_SYNC_SECRET || secret !== process.env.CALENDAR_SYNC_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dryRun = process.env.SYNC_DRY_RUN === "true";
  const summary: Record<string, unknown> = { dryRun, startedAt: new Date().toISOString() };

  const contactIndex = await buildContactIndex();
  summary.contactsIndexed = contactIndex.size;

  for (const director of DIRECTORS) {
    try {
      const { events, nextSyncToken } = await fetchEventsForDirector(director.name);
      let eventsWithMatches = 0;

      for (const event of events) {
        const matchedContactIds: string[] = [];

        for (const attendee of event.attendees ?? []) {
          if (attendee.self) continue;
          const match = matchAttendee(attendee, contactIndex);
          if (!match) continue;

          matchedContactIds.push(match.contactId);
          if (match.tier > 1 && match.inferredEmail) {
            addToBackfillQueue({
              contactId: match.contactId,
              contactName: match.contactName,
              proposedEmail: match.inferredEmail,
              source: `calendar:${director.name}:${event.id}`,
              confidence: match.tier === 2 ? "high" : "medium",
              dryRun,
            });
          }
        }

        if (matchedContactIds.length >= 2) {
          const eventDate = event.start.dateTime ?? new Date().toISOString();
          recordCoOccurrences(matchedContactIds, director.name, eventDate);
          eventsWithMatches++;
        }
      }

      if (!dryRun && nextSyncToken) {
        updateSyncState(director.name, {
          lastSyncAt: new Date().toISOString(),
          calendarSyncToken: nextSyncToken,
        });
      }

      summary[director.name] = { eventsFetched: events.length, eventsWithMatches };
    } catch (err) {
      summary[director.name] = { error: String(err) };
    }
  }

  const backfill = await processBackfillQueue(dryRun);
  summary.backfill = backfill;

  const newProposals = generateProposals(contactIndex);
  summary.newProposals = newProposals.length;

  return NextResponse.json(summary);
}
