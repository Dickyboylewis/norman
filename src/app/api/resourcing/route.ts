import { NextResponse } from "next/server";
import fixture from "@/lib/fixtures/resourcing.json";

export const dynamic = "force-dynamic";

// Stub: returns the static fixture. The live CMap DRS query replaces this later.
export async function GET() {
  return NextResponse.json(fixture);
}
