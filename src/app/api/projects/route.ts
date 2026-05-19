import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// TODO: Replace this mock data with a live CMap DRS query via mssql (Microsoft SQL Server).
// The query will join WR_Project, WR_ProjectBudget, and WR_TimeEntry to compute
// fee, bookedSoFar, and futureSchedule from the CMap database.

export interface ProjectData {
  id: string;
  projectNumber: string;
  projectName: string;
  client: string;
  projectManager: string;
  ribaStage: number;
  startDate: string;
  endDate: string;
  fee: number;
  bookedSoFar: number;
  futureSchedule: number;
  sector: string;
  remainingBudget: number;
  profitHealthPercent: number;
}

const RAW_PROJECTS = [
  { id: "p5361", projectNumber: "5361", projectName: "Belgrave Square",    client: "Liberty Commodities Ltd",                     projectManager: "Kit Gunaratne",    ribaStage: 4, startDate: "2025-03-01", endDate: "2026-09-30", fee: 130880,  bookedSoFar: 77682,  futureSchedule: 0,      sector: "Commercial Office" },
  { id: "p5470", projectNumber: "5470", projectName: "Film House",          client: "Reel (Film) Limited",                         projectManager: "Tino Baranda",     ribaStage: 5, startDate: "2024-06-15", endDate: "2026-08-31", fee: 1164670, bookedSoFar: 871931, futureSchedule: 980,    sector: "Mixed Use"         },
  { id: "p5491", projectNumber: "5491", projectName: "14 Bedford Row",      client: "Truenorth",                                   projectManager: "Paloma Quintana",  ribaStage: 3, startDate: "2025-09-01", endDate: "2027-03-31", fee: 297786,  bookedSoFar: 284330, futureSchedule: 20220,  sector: "Commercial Office" },
  { id: "p5513", projectNumber: "5513", projectName: "1 Kingsway",          client: "Blue Coast Capital",                          projectManager: "Dicky Lewis",      ribaStage: 2, startDate: "2026-01-15", endDate: "2027-12-31", fee: 10840,   bookedSoFar: 7967,   futureSchedule: 0,      sector: "Commercial Office" },
  { id: "p5469", projectNumber: "5469", projectName: "10 Brick Street",     client: "Grantham Court Properties (Mayfair) Ltd",     projectManager: "Francesc Montosa", ribaStage: 4, startDate: "2024-11-01", endDate: "2026-10-31", fee: 396416,  bookedSoFar: 595460, futureSchedule: 29198,  sector: "Commercial Office" },
  { id: "p5532", projectNumber: "5532", projectName: "48 Charles Street",   client: "Berkeley Square Holdings Limited",            projectManager: "Jonathan Spratt",  ribaStage: 3, startDate: "2025-04-01", endDate: "2027-06-30", fee: 90732,   bookedSoFar: 75002,  futureSchedule: 128380, sector: "Mayfair Office"    },
  { id: "p5540", projectNumber: "5540", projectName: "Double Wardour",      client: "Wardour 2 Propco Limited",                   projectManager: "Kit Gunaratne",    ribaStage: 4, startDate: "2024-10-01", endDate: "2026-12-31", fee: 142559,  bookedSoFar: 65008,  futureSchedule: 412273, sector: "Mixed Use"         },
  { id: "p5527", projectNumber: "5527", projectName: "2 Moorgate",          client: "WRE",                                         projectManager: "Tino Baranda",     ribaStage: 5, startDate: "2024-08-01", endDate: "2026-07-31", fee: 94023,   bookedSoFar: 82094,  futureSchedule: 96024,  sector: "City Office"       },
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const projects: ProjectData[] = RAW_PROJECTS.map(p => {
    const remainingBudget = p.fee - p.bookedSoFar - p.futureSchedule;
    const profitHealthPercent = +(remainingBudget / p.fee * 100).toFixed(1);
    return { ...p, remainingBudget, profitHealthPercent };
  });

  return NextResponse.json(projects);
}
