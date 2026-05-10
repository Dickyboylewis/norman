import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBackfillEntries, updateBackfillStatus } from "@/lib/email-backfill";
import { appendAuditLog } from "@/lib/audit-log";
import { getDirectorByEmail } from "@/lib/directors";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD = 1461714569;
const MONDAY_API = "https://api.monday.com/v2";

export async function POST(req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing MONDAY_API_KEY" }, { status: 500 });

  const director = getDirectorByEmail(session.user.email ?? "");
  const decidedBy = director?.name ?? session.user.email ?? "unknown";

  const body = await req.json() as { chosenEmail?: string };
  const chosenEmail = body.chosenEmail?.trim();
  if (!chosenEmail) {
    return NextResponse.json({ error: "chosenEmail is required" }, { status: 400 });
  }

  const entries = getBackfillEntries().filter(
    e => e.contactId === contactId && (e.status === "pending" || e.status === "dry-run"),
  );
  if (entries.length === 0) {
    return NextResponse.json({ error: "No pending backfill entries for this contact" }, { status: 404 });
  }

  const match = entries.find(e => e.proposedEmail === chosenEmail);
  if (!match) {
    return NextResponse.json({ error: "chosenEmail does not match any candidate" }, { status: 400 });
  }

  // Write to Monday
  const emailValue = JSON.stringify({ email: chosenEmail, text: chosenEmail });
  const mutation = `mutation {
    change_column_value(
      item_id: ${contactId},
      board_id: ${CONTACTS_BOARD},
      column_id: "contact_email",
      value: ${JSON.stringify(emailValue)}
    ) { id }
  }`;
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query: mutation }),
  });
  const data = await res.json() as { errors?: { message: string }[] };
  if (data.errors?.length) {
    return NextResponse.json(
      { error: `Monday write failed: ${data.errors[0].message}` },
      { status: 500 },
    );
  }

  updateBackfillStatus(contactId, "approved", chosenEmail, decidedBy);
  appendAuditLog(decidedBy, "backfill:approved", `contactId=${contactId} (${match.contactName}) email=${chosenEmail}`);

  return NextResponse.json({ success: true, contactId, appliedEmail: chosenEmail });
}
