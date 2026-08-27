export interface ResourcingProjectAllocation {
  projectCode: string;
  projectTitle: string;
  percentage: number;
  /** Confirmed work. Won entries always carry probability 100. */
  won: boolean;
  /** Win probability: 10, 25, 50, 75 or 100. */
  probability: number;
}

export interface ResourcingTimeOff {
  label: string;
  days: number;
}

export interface ResourcingWeek {
  weekStart: string;
  projects: ResourcingProjectAllocation[];
  timeOffDays: ResourcingTimeOff[];
}

export interface ResourcingPerson {
  userId: string;
  name: string;
  jobTitle: string | null;
  weeks: ResourcingWeek[];
}

export interface ResourcingData {
  generatedAt: string;
  weekStarts: string[];
  people: ResourcingPerson[];
}
