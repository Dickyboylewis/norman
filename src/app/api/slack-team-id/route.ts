import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const teamId = process.env.SLACK_TEAM_ID;
  if (!teamId) {
    return NextResponse.json({ configured: false });
  }
  return NextResponse.json({ configured: true, teamId });
}
