import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposals, updateProposalStatus } from "@/lib/connection-proposals";
import { addReciprocalConnection } from "@/lib/monday-connections";
import { appendAuditLog } from "@/lib/audit-log";
import { getDirectorByEmail } from "@/lib/directors";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing MONDAY_API_KEY" }, { status: 500 });

  const director = getDirectorByEmail(session.user.email ?? "");
  const decidedBy = director?.name ?? session.user.email ?? "unknown";

  const proposals = getProposals();
  const proposal = proposals.find(p => p.id === id);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "pending") {
    return NextResponse.json({ error: "Proposal is not pending", status: proposal.status }, { status: 409 });
  }

  try {
    await addReciprocalConnection(apiKey, proposal.contactId1, proposal.contactId2);
  } catch (err) {
    return NextResponse.json(
      { error: `Monday write failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 },
    );
  }

  updateProposalStatus(id, "accepted", decidedBy);
  appendAuditLog(decidedBy, "proposal:approved", `id=${id} contacts=${proposal.contactId1}+${proposal.contactId2} (${proposal.contactName1} ↔ ${proposal.contactName2})`);

  return NextResponse.json({ success: true, proposalId: id });
}
