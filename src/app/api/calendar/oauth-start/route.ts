import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDirectorByEmail } from "@/lib/directors";
import { createNonce } from "@/lib/calendar-nonces";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const director = getDirectorByEmail(session.user.email);
  if (!director) {
    return NextResponse.json(
      { error: "Your account is not a recognised director account" },
      { status: 403 },
    );
  }

  const nonce = createNonce(director.name);

  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) {
    return NextResponse.json({ error: "OAuth client not configured" }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://wte.red";
  const redirectUri = `${baseUrl}/api/calendar/oauth-callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/calendar.readonly",
    access_type:   "offline",
    prompt:        "consent",
    state:         nonce,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    302,
  );
}
