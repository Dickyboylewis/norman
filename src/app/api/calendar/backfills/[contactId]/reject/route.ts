import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBackfillEntries, updateBackfillStatus } from "@/lib/email-backfill";
import { appendAuditLog } from "@/lib/audit-log";
import { getDirectorByEmail } from "@/lib/directors";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contactId } = await params;
  const director = getDirectorByEmail(session.user.email ?? "");
  const decidedBy = director?.name ?? session.user.email ?? "unknown";

  const entries = getBackfillEntries().filter(e => e.contactId === contactId);
  if (entries.length === 0) {
    return NextResponse.json({ error: "No backfill entries for this contact" }, { status: 404 });
  }

  updateBackfillStatus(contactId, "rejected", null, decidedBy);
  appendAuditLog(decidedBy, "backfill:rejected", `contactId=${contactId} (${entries[0]?.contactName ?? "unknown"})`);

  return NextResponse.json({ success: true });
}
