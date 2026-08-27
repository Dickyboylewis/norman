export interface ResourcingProjectAllocation {
  projectCode: string;
  projectTitle: string;
  percentage: number;
  /** Speculative work; absent means confirmed/won. */
  potential?: boolean;
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
