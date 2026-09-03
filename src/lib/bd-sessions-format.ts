export interface BdSessionSummaryInput {
  type: string;
  startedAt: string;
  endsAt: string;
  completedAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  core: "Core",
  stretch: "Stretch",
  bd500: "500",
};

const LONDON_DAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
});

const LONDON_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const MAX_SUMMARY_LINES = 5;

function formatOneSession(s: BdSessionSummaryInput): string {
  const start = new Date(s.startedAt);
  const end = new Date(s.endsAt);
  const mark = s.completedAt ? "✓" : "○";
  const label = TYPE_LABELS[s.type] ?? s.type;
  return `${mark} ${label} ${LONDON_DAY.format(start)} ${LONDON_TIME.format(start)}–${LONDON_TIME.format(end)}`;
}

/**
 * One-line summary of a director's BD sessions this week, e.g.
 * "✓ Core Mon 09:12–09:42 · ○ Stretch Wed 14:03–14:33".
 */
export function formatBdSessionLine(sessions: BdSessionSummaryInput[]): string {
  if (sessions.length === 0) return "No BD sessions yet";
  return [...sessions]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map(formatOneSession)
    .join(" · ");
}

/**
 * The same summary as separate lines, one per session, capped at five
 * with a final "+N more" line beyond that.
 */
export function formatBdSessionLines(sessions: BdSessionSummaryInput[]): string[] {
  if (sessions.length === 0) return ["No BD sessions yet"];
  const lines = [...sessions]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map(formatOneSession);
  if (lines.length > MAX_SUMMARY_LINES) {
    return [...lines.slice(0, MAX_SUMMARY_LINES), `+${lines.length - MAX_SUMMARY_LINES} more`];
  }
  return lines;
}
