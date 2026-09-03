import { NextResponse } from "next/server";
import fixture from "@/lib/fixtures/resourcing.json";
import { getProjectColorMap } from "@/lib/project-colors-server";
import type { ResourcingData } from "@/lib/resourcing-types";

export const dynamic = "force-dynamic";

// Stub: returns the static fixture. The live CMap DRS query replaces this later.
export async function GET() {
  const data = fixture as ResourcingData;
  const codes: string[] = [];
  for (const person of data.people) {
    for (const week of person.weeks) {
      for (const allocation of week.projects) codes.push(allocation.projectCode);
    }
  }
  const colors = await getProjectColorMap(codes);
  const withColors: ResourcingData = {
    ...data,
    people: data.people.map((person) => ({
      ...person,
      weeks: person.weeks.map((week) => ({
        ...week,
        projects: week.projects.map((allocation) => ({
          ...allocation,
          color: colors[allocation.projectCode],
        })),
      })),
    })),
  };
  return NextResponse.json(withColors);
}
