import type {
  ResourcingData,
  ResourcingProjectAllocation,
  ResourcingWeek,
} from "./resourcing-types";

export type ResourcingFilterMode = "confirmed" | "75plus" | "all";

export function passesFilter(
  project: ResourcingProjectAllocation,
  mode: ResourcingFilterMode,
): boolean {
  if (project.won) return true;
  if (mode === "confirmed") return false;
  if (mode === "75plus") return project.probability >= 75;
  return true;
}

/** Returns the week with only the projects that pass the filter mode. */
export function filterWeek(week: ResourcingWeek, mode: ResourcingFilterMode): ResourcingWeek {
  return { ...week, projects: week.projects.filter(p => passesFilter(p, mode)) };
}

export interface PersonWeekFte {
  wonFte: number;
  pipelineFte: number;
  timeOffFte: number;
  availableFte: number;
}

export function personWeekFte(week: ResourcingWeek): PersonWeekFte {
  let won = 0;
  let pipeline = 0;
  for (const p of week.projects) {
    if (p.won) won += p.percentage;
    else pipeline += p.percentage;
  }
  const timeOffFte = week.timeOffDays.reduce((sum, t) => sum + t.days, 0) / 5;
  return {
    wonFte: won / 100,
    pipelineFte: pipeline / 100,
    timeOffFte,
    availableFte: Math.max(0, 1 - timeOffFte),
  };
}

export interface WeekTeamTotals {
  weekStart: string;
  capacity: number;
  wonDemand: number;
  pipelineDemand: number;
}

export interface DemandCapacityDatum {
  weekStart: string;
  capacity: number;
  wonDemand: number;
  pipelineDemand: number;
  [key: string]: number | string;
}

export function buildDemandCapacityData(
  data: ResourcingData,
  mode: ResourcingFilterMode,
): DemandCapacityDatum[] {
  return data.weekStarts.map(weekStart => {
    const row: DemandCapacityDatum = {
      weekStart,
      capacity: 0,
      wonDemand: 0,
      pipelineDemand: 0,
    };
    for (const person of data.people) {
      const week = person.weeks.find(w => w.weekStart === weekStart);
      const fte = week
        ? personWeekFte(filterWeek(week, mode))
        : { wonFte: 0, pipelineFte: 0, timeOffFte: 0, availableFte: 1 };
      row.capacity += fte.availableFte;
      row.wonDemand += fte.wonFte;
      row.pipelineDemand += fte.pipelineFte;
      row[`won_${person.userId}`] = fte.wonFte;
      row[`pipe_${person.userId}`] = fte.pipelineFte;
    }
    return row;
  });
}

export function teamWeekTotals(
  data: ResourcingData,
  mode: ResourcingFilterMode,
): WeekTeamTotals[] {
  return buildDemandCapacityData(data, mode).map(row => ({
    weekStart: row.weekStart,
    capacity: row.capacity,
    wonDemand: row.wonDemand,
    pipelineDemand: row.pipelineDemand,
  }));
}
