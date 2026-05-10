import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DIRECTORS } from "@/lib/directors";
import { getTokens } from "@/lib/calendar-tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const directors = DIRECTORS.map(d => {
    const tokens = getTokens(d.name);
    return {
      name:        d.name,
      connected:   !!(tokens?.refreshToken),
      googleEmail: tokens?.googleEmail ?? null,
      connectedAt: tokens?.connectedAt ?? null,
      lastSyncAt:  tokens?.lastSyncAt  ?? null,
    };
  });

  return NextResponse.json({ directors });
}
