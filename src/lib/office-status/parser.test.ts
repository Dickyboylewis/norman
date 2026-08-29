import { describe, expect, it } from "vitest";
import {
  ROSTER,
  parseEvent,
  resolveStatuses,
  type CalendarEventInput,
} from "./parser";

// 1 Sep 2026 is BST (UTC+1). Fixtures are anchored to UK wall-clock time so
// the suite passes regardless of the machine's timezone.
const BST_OFFSET_HOURS = 1;
const DAY = new Date(Date.UTC(2026, 8, 1)); // all-day events arrive as UTC-midnight dates

/** `hour`:`minute` UK wall-clock time on 1 Sep 2026. */
function at(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 8, 1, hour - BST_OFFSET_HOURS, minute));
}

function allDay(title: string): CalendarEventInput {
  return { title, isAllDay: true, start: DAY, end: new Date(Date.UTC(2026, 8, 2)) };
}

function timed(title: string, startHour: number, endHour: number): CalendarEventInput {
  return { title, isAllDay: false, start: at(startHour), end: at(endHour) };
}

function statusOf(events: CalendarEventInput[], now: Date, personId: string) {
  return resolveStatuses(events, ROSTER, now).find(s => s.personId === personId)?.status;
}

describe("parseEvent — real calendar formats", () => {
  it('"Jonathan Hol" all-day → holiday for Jonathan', () => {
    const parsed = parseEvent("Jonathan Hol", true, DAY, new Date(2026, 8, 2), ROSTER);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].personId).toBe("jonathan");
    expect(parsed[0].status).toBe("holiday");
  });

  it('"Dicky hol" (lower case) → holiday', () => {
    expect(statusOf([allDay("Dicky hol")], at(10), "dicky")).toBe("holiday");
  });

  it('"Joe - Holiday" → holiday', () => {
    expect(statusOf([allDay("Joe - Holiday")], at(10), "joe")).toBe("holiday");
  });

  it('"Jesus holidays" → holiday', () => {
    expect(statusOf([allDay("Jesus holidays")], at(10), "jesus")).toBe("holiday");
  });

  it('"Lizi - Hol" → nothing (Lizi is not on the roster)', () => {
    const parsed = parseEvent("Lizi - Hol", true, DAY, new Date(2026, 8, 2), ROSTER);
    expect(parsed).toHaveLength(0);
  });

  it('"Artem WFH" → home', () => {
    expect(statusOf([allDay("Artem WFH")], at(10), "artem")).toBe("home");
  });

  it('"Jules WFH" → home', () => {
    expect(statusOf([allDay("Jules WFH")], at(10), "jules")).toBe("home");
  });

  it('"Tino Hol PM": 10:00 → none, 15:00 → holiday', () => {
    const events = [allDay("Tino Hol PM")];
    expect(statusOf(events, at(10), "tino")).toBe("none");
    expect(statusOf(events, at(15), "tino")).toBe("holiday");
  });

  it('"Jonathan WFH AM": 10:00 → home, 15:00 → none', () => {
    const events = [allDay("Jonathan WFH AM")];
    expect(statusOf(events, at(10), "jonathan")).toBe("home");
    expect(statusOf(events, at(15), "jonathan")).toBe("none");
  });

  it('"Hope WFH AM/Hol PM": 10:00 → home, 15:00 → holiday', () => {
    const events = [allDay("Hope WFH AM/Hol PM")];
    expect(statusOf(events, at(10), "hope")).toBe("home");
    expect(statusOf(events, at(15), "hope")).toBe("holiday");
  });

  it('"KG DL catchup" timed 14:00–15:00 at 14:30 → meeting for Kit and Dicky', () => {
    const events = [timed("KG DL catchup", 14, 15)];
    expect(statusOf(events, at(14, 30), "kit")).toBe("meeting");
    expect(statusOf(events, at(14, 30), "dicky")).toBe("meeting");
    expect(statusOf(events, at(15, 30), "kit")).toBe("none");
  });

  it('"Alex 1st Day" → no status', () => {
    const parsed = parseEvent("Alex 1st Day", true, DAY, new Date(2026, 8, 2), ROSTER);
    expect(parsed).toHaveLength(0);
  });

  it("a person with no status keyword on an all-day event → no status", () => {
    const parsed = parseEvent("Jonathan 1st Day", true, DAY, new Date(2026, 8, 2), ROSTER);
    expect(parsed).toHaveLength(0);
  });

  it("a title with no recognisable person → nothing", () => {
    expect(parseEvent("Studio deep clean", true, DAY, new Date(2026, 8, 2), ROSTER)).toHaveLength(0);
    expect(parseEvent("Holiday", true, DAY, new Date(2026, 8, 2), ROSTER)).toHaveLength(0);
  });

  it("initials must be whole words — words containing the letters do not match", () => {
    const parsed = parseEvent("deadline review", true, DAY, new Date(2026, 8, 2), ROSTER);
    expect(parsed).toHaveLength(0);
  });

  it('"James Hol" → holiday; "Jesus WFH" → home; "Dilan Hol" → holiday; "Dani Hol" → holiday', () => {
    expect(statusOf([allDay("James Hol")], at(10), "james")).toBe("holiday");
    expect(statusOf([allDay("Jesus WFH")], at(10), "jesus")).toBe("home");
    expect(statusOf([allDay("Dilan Hol")], at(10), "dilan")).toBe("holiday");
    expect(statusOf([allDay("Dani Hol")], at(10), "dani")).toBe("holiday");
  });

  it("timed site visit → site; timed event outside its window → none", () => {
    const events = [timed("Dicky site visit", 9, 12)];
    expect(statusOf(events, at(10), "dicky")).toBe("site");
    expect(statusOf(events, at(14), "dicky")).toBe("none");
  });

  it("priority: sick beats holiday beats home", () => {
    const events = [allDay("Katy sick"), allDay("Katy Hol"), allDay("Katy WFH")];
    expect(statusOf(events, at(10), "katy")).toBe("sick");
  });

  it("multi-day all-day holiday spanning today → holiday at 10:00 UK", () => {
    const event: CalendarEventInput = {
      title: "Joe - Holiday",
      isAllDay: true,
      start: new Date(Date.UTC(2026, 7, 29)), // three days before "today" (1 Sep)
      end: new Date(Date.UTC(2026, 8, 2)), // exclusive end: tomorrow
    };
    expect(statusOf([event], at(10), "joe")).toBe("holiday");
  });

  it("widened day window: 06:30 and 21:30 UK → holiday, 05:30 → none", () => {
    const events = [allDay("Dani Hol")];
    expect(statusOf(events, at(6, 30), "dani")).toBe("holiday");
    expect(statusOf(events, at(21, 30), "dani")).toBe("holiday");
    expect(statusOf(events, at(5, 30), "dani")).toBe("none");
  });

  it("DST-aware half-day boundary: Tino Hol PM at 12:30 UK → none, 13:30 UK → holiday", () => {
    const events = [allDay("Tino Hol PM")];
    expect(statusOf(events, at(12, 30), "tino")).toBe("none");
    expect(statusOf(events, at(13, 30), "tino")).toBe("holiday");
    const parsed = parseEvent("Tino Hol PM", true, DAY, new Date(2026, 8, 2), ROSTER);
    // 13:00 Europe/London on 1 Sep 2026 (BST) is 12:00 UTC
    expect(parsed[0].windowStart.toISOString()).toBe("2026-09-01T12:00:00.000Z");
    expect(parsed[0].windowEnd.toISOString()).toBe("2026-09-01T21:00:00.000Z");
  });

  it("duplicate first names require disambiguation", () => {
    const roster = [
      ...ROSTER,
      { personId: "dicky2", fullName: "Dicky Jones", firstName: "Dicky", initials: "DJ" },
    ];
    expect(parseEvent("Dicky Hol", true, DAY, new Date(2026, 8, 2), roster)).toHaveLength(0);
    const withSurname = parseEvent("Dicky Lewis Hol", true, DAY, new Date(Date.UTC(2026, 8, 2)), roster);
    expect(withSurname).toHaveLength(1);
    expect(withSurname[0].personId).toBe("dicky");
  });
});
