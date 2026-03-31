"use client";

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getQuarterInfo(date: Date) {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  const quarterStart = new Date(date.getFullYear(), (quarter - 1) * 3, 1);
  const quarterEnd = new Date(date.getFullYear(), quarter * 3, 1);
  const pct = Math.min(
    100,
    Math.max(0, ((date.getTime() - quarterStart.getTime()) / (quarterEnd.getTime() - quarterStart.getTime())) * 100)
  );
  return { quarter, pct };
}

export function TimeTracker() {
  const now = new Date();
  const week = getISOWeekNumber(now);
  const { quarter, pct } = getQuarterInfo(now);

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-semibold tracking-wide whitespace-nowrap"
        style={{ color: "#DA2C26", fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
      >
        Wk {week} of 52 · Q{quarter}
      </span>
      <div className="relative w-14 h-1.5 rounded-full bg-[#DA2C26]/15 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: "#DA2C26" }}
        />
      </div>
      <span
        className="text-[10px] font-bold tabular-nums whitespace-nowrap"
        style={{ color: "#DA2C26", fontFamily: "var(--font-roboto), Roboto, sans-serif" }}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
