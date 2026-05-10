import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProposals, updateProposalStatus } from "@/lib/connection-proposals";
import { appendAuditLog } from "@/lib/audit-log";
import { getDirectorByEmail } from "@/lib/directors";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const director = getDirectorByEmail(session.user.email ?? "");
  const decidedBy = director?.name ?? session.user.email ?? "unknown";

  const proposals = getProposals();
  const proposal = proposals.find(p => p.id === id);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  updateProposalStatus(id, "rejected", decidedBy);
  appendAuditLog(decidedBy, "proposal:rejected", `id=${id} contacts=${proposal.contactId1}+${proposal.contactId2} (${proposal.contactName1} ↔ ${proposal.contactName2})`);

  return NextResponse.json({ success: true });
}
