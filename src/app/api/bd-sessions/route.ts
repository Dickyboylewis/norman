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
  let name = "unresolved";
  let action = "unknown";
  const respond = (status: number, payload: Record<string, unknown>) => {
    const outcome = status < 300 ? "ok" : `${status} ${payload.error ?? ""}`.trim();
    console.log(`bd-sessions POST: name=${name} action=${action} outcome=${outcome}`);
    return NextResponse.json(payload, { status });
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Missing or malformed JSON body" });
  }
  if (typeof body !== "object" || body === null) {
    return respond(400, { error: "Missing or malformed JSON body" });
  }
  const b = body as Record<string, unknown>;
  if (typeof b.action === "string") action = b.action;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return respond(401, { error: "Not signed in" });
  }
  const director = bdNameForEmail(email);
  if (!director) {
    return respond(401, { error: `No director is mapped for ${email}` });
  }
  name = director;

  if (b.action === "start") {
    if (typeof b.type !== "string" || !BD_SESSION_TYPES.includes(b.type as BdSessionType)) {
      return respond(400, { error: "Invalid session type" });
    }
    const durationMinutes = Number(b.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) {
      return respond(400, { error: "Invalid durationMinutes" });
    }
    const record = startSession(director, b.type as BdSessionType, durationMinutes);
    return respond(200, { session: record });
  }

  if (b.action === "complete") {
    if (typeof b.id !== "string" || !b.id) {
      return respond(400, { error: "Invalid session id" });
    }
    const record = completeSession(b.id);
    if (!record) {
      return respond(404, { error: "Session not found" });
    }
    return respond(200, { session: record });
  }

  return respond(400, { error: "Unknown action" });
}
