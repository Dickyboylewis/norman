import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  BD_DIRECTOR_NAMES,
  BD_SESSION_TYPES,
  bdNameForEmail,
  completeSession,
  getSessionsForCurrentWeek,
  startSession,
  type BdSession,
  type BdSessionType,
} from "@/lib/bd-sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  const grouped: Record<string, BdSession[]> = {};
  for (const name of BD_DIRECTOR_NAMES) grouped[name] = [];
  for (const session of getSessionsForCurrentWeek()) {
    (grouped[session.name] ??= []).push(session);
  }
  return NextResponse.json({ sessions: grouped });
}

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const name = bdNameForEmail(email);
  if (!name) {
    return NextResponse.json(
      { error: `No director is mapped for ${email}` },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  if (b.action === "start") {
    if (typeof b.type !== "string" || !BD_SESSION_TYPES.includes(b.type as BdSessionType)) {
      return NextResponse.json({ error: "Invalid session type" }, { status: 400 });
    }
    const durationMinutes = Number(b.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) {
      return NextResponse.json({ error: "Invalid durationMinutes" }, { status: 400 });
    }
    const record = startSession(name, b.type as BdSessionType, durationMinutes);
    return NextResponse.json({ session: record });
  }

  if (b.action === "complete") {
    if (typeof b.id !== "string" || !b.id) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }
    const record = completeSession(b.id);
    if (!record) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ session: record });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
