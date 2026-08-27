import type { ResourcingData, ResourcingWeek } from "./resourcing-types";

export interface PersonWeekFte {
  wonFte: number;
  potentialFte: number;
  timeOffFte: number;
  availableFte: number;
}

export function personWeekFte(week: ResourcingWeek): PersonWeekFte {
  let won = 0;
  let potential = 0;
  for (const p of week.projects) {
    if (p.potential === true) potential += p.percentage;
    else won += p.percentage;
  }
  const timeOffFte = week.timeOffDays.reduce((sum, t) => sum + t.days, 0) / 5;
  return {
    wonFte: won / 100,
    potentialFte: potential / 100,
    timeOffFte,
    availableFte: Math.max(0, 1 - timeOffFte),
  };
}

export interface WeekTeamTotals {
  weekStart: string;
  capacity: number;
  wonDemand: number;
  potentialDemand: number;
}

export interface DemandCapacityDatum {
  weekStart: string;
  capacity: number;
  wonDemand: number;
  potentialDemand: number;
  [key: string]: number | string;
}

export function buildDemandCapacityData(data: ResourcingData): DemandCapacityDatum[] {
  return data.weekStarts.map(weekStart => {
    const row: DemandCapacityDatum = {
      weekStart,
      capacity: 0,
      wonDemand: 0,
      potentialDemand: 0,
    };
    for (const person of data.people) {
      const week = person.weeks.find(w => w.weekStart === weekStart);
      const fte = week
        ? personWeekFte(week)
        : { wonFte: 0, potentialFte: 0, timeOffFte: 0, availableFte: 1 };
      row.capacity += fte.availableFte;
      row.wonDemand += fte.wonFte;
      row.potentialDemand += fte.potentialFte;
      row[`won_${person.userId}`] = fte.wonFte;
      row[`pot_${person.userId}`] = fte.potentialFte;
    }
    return row;
  });
}

export function teamWeekTotals(data: ResourcingData): WeekTeamTotals[] {
  return buildDemandCapacityData(data).map(row => ({
    weekStart: row.weekStart,
    capacity: row.capacity,
    wonDemand: row.wonDemand,
    potentialDemand: row.potentialDemand,
  }));
}
