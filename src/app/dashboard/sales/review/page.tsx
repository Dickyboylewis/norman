"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Users, Mail, Inbox } from "lucide-react";
import type { CoEvent } from "@/lib/co-occurrence";

// ── Types (mirrors the enriched proposals API response) ───────────────────────

interface ContactMeta {
  id: string;
  name: string;
  position: string | null;
  accountId: string | null;
  accountName: string | null;
  accountLogoUrl: string | null;
}

interface EnrichedProposal {
  id: string;
  contactId1: string;
  contactId2: string;
  contact1: ContactMeta;
  contact2: ContactMeta;
  coOccurrenceCount: number;
  lastSeen: string;
  directors: string[];
  status: string;
  createdAt: string;
  events: CoEvent[];
}

interface BackfillCandidate {
  proposedEmail: string;
  source: string;
  directorName: string;
  confidence: "high" | "medium" | "low";
}

interface BackfillGroup {
  contactId: string;
  contactName: string;
  contact: ContactMeta;
  candidates: BackfillCandidate[];
  isMultiCandidate: boolean;
}

interface ReviewQueueData {
  proposals: EnrichedProposal[];
  backfills: BackfillGroup[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchQueue(): Promise<ReviewQueueData> {
  const res = await fetch("/api/calendar/proposals");
  if (!res.ok) throw new Error("Failed to load review queue");
  return res.json() as Promise<ReviewQueueData>;
}

async function approveProposal(id: string): Promise<void> {
  const res = await fetch(`/api/calendar/proposals/${id}/approve`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? "Approve failed");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("norman:contact-data-changed"));
  }
}

async function rejectProposal(id: string): Promise<void> {
  const res = await fetch(`/api/calendar/proposals/${id}/reject`, { method: "POST" });
  if (!res.ok) throw new Error("Reject failed");
}

async function approveBackfill(contactId: string, chosenEmail: string): Promise<void> {
  const res = await fetch(`/api/calendar/backfills/${contactId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosenEmail }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? "Approve failed");
  }
}

async function rejectBackfill(contactId: string): Promise<void> {
  const res = await fetch(`/api/calendar/backfills/${contactId}/reject`, { method: "POST" });
  if (!res.ok) throw new Error("Reject failed");
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string): string {
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

const BRAND_RED = "#DA2C26";

// ── Contact pill ──────────────────────────────────────────────────────────────

function ContactPill({ contact }: { contact: ContactMeta }) {
  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-0">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ background: BRAND_RED }}
      >
        {contact.accountLogoUrl ? (
          <img src={contact.accountLogoUrl} alt="" className="w-8 h-8 rounded-full object-contain bg-white" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          initials(contact.name)
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-900 truncate">{contact.name}</div>
        {contact.accountName && (
          <div className="text-xs text-gray-500 truncate">{contact.accountName}</div>
        )}
        {contact.position && !contact.accountName && (
          <div className="text-xs text-gray-500 truncate">{contact.position}</div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
      <div className="flex gap-3 items-center mb-4">
        <div className="h-14 w-40 bg-slate-200 rounded-lg" />
        <div className="h-6 w-6 bg-slate-200 rounded-full" />
        <div className="h-14 w-40 bg-slate-200 rounded-lg" />
      </div>
      <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
      <div className="flex gap-2 justify-end">
        <div className="h-9 w-24 bg-slate-200 rounded-lg" />
        <div className="h-9 w-20 bg-slate-200 rounded-lg" />
        <div className="h-9 w-14 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

// ── Connection card ───────────────────────────────────────────────────────────

function ConnectionCard({
  proposal,
  onApprove,
  onReject,
  error,
  removing,
}: {
  proposal: EnrichedProposal;
  onApprove: () => void;
  onReject: () => void;
  error: string | null;
  removing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const dayCount = daysSince(proposal.createdAt);
  const dayStr = dayCount === 0 ? "today" : `${dayCount}d ago`;
  const dirStr = proposal.directors.map(d => `${d.split(" ")[0]}'s calendar`).join(" + ");

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 transition-all duration-300 ${
        removing ? "opacity-0 -translate-x-2 pointer-events-none" : "opacity-100 translate-x-0"
      }`}
    >
      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Pair display */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <ContactPill contact={proposal.contact1} />
        <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-base">?</div>
        <ContactPill contact={proposal.contact2} />
      </div>

      {/* Meta */}
      <div className="text-xs text-slate-500 mb-1">
        Met <strong className="text-slate-700">{proposal.coOccurrenceCount}×</strong> · last {formatDate(proposal.lastSeen)} · Found via {dirStr} ({dayStr})
      </div>

      {/* Expandable events */}
      {proposal.events.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View meetings {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1">
              {proposal.events.map((ev, i) => (
                <li key={i} className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1">
                  <span className="font-medium">{ev.summary || "(no title)"}</span>
                  <span className="text-slate-400 ml-2">{formatDate(ev.date)}</span>
                  <span className="text-slate-400 ml-2">via {ev.directorName.split(" ")[0]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end pt-1">
        <button
          onClick={onReject}
          className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:border-slate-500 hover:text-slate-800 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          className="px-4 py-2 text-sm text-white rounded-lg font-semibold transition-colors hover:opacity-90"
          style={{ background: BRAND_RED }}
        >
          Approve
        </button>
      </div>
    </div>
  );
}

// ── Backfill card ─────────────────────────────────────────────────────────────

function BackfillCard({
  group,
  onApprove,
  onReject,
  error,
  removing,
}: {
  group: BackfillGroup;
  onApprove: (email: string) => void;
  onReject: () => void;
  error: string | null;
  removing: boolean;
}) {
  const [selectedEmail, setSelectedEmail] = useState<string>(
    group.isMultiCandidate ? "" : group.candidates[0]?.proposedEmail ?? "",
  );

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 transition-all duration-300 ${
        removing ? "opacity-0 -translate-x-2 pointer-events-none" : "opacity-100 translate-x-0"
      }`}
    >
      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Contact info */}
      <div className="flex items-center gap-2 mb-3">
        <ContactPill contact={group.contact} />
        <span className="text-xs text-slate-500 ml-1">· No email currently set</span>
      </div>

      {/* Candidates */}
      {group.isMultiCandidate ? (
        <div className="mb-4">
          <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Multiple candidates found. Pick the correct one or reject all.
          </p>
          <div className="space-y-2">
            {group.candidates.map(c => (
              <label
                key={c.proposedEmail}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  selectedEmail === c.proposedEmail
                    ? "border-red-400 bg-red-50"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <input
                  type="radio"
                  name={`email-${group.contactId}`}
                  value={c.proposedEmail}
                  checked={selectedEmail === c.proposedEmail}
                  onChange={() => setSelectedEmail(c.proposedEmail)}
                  className="mt-0.5 accent-red-600"
                />
                <div>
                  <div className="text-sm font-mono font-medium text-slate-800">{c.proposedEmail}</div>
                  <div className="text-xs text-slate-500">from {c.directorName.split(" ")[0]}&apos;s calendar · {c.confidence} confidence</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 text-xs text-slate-600">
          Suggested: <span className="font-mono font-medium text-slate-800">{group.candidates[0]?.proposedEmail}</span>
          <span className="ml-2 text-slate-400">from {group.candidates[0]?.directorName.split(" ")[0]}&apos;s calendar</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onReject}
          className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:border-slate-500 hover:text-slate-800 transition-colors"
        >
          Reject all
        </button>
        <button
          disabled={!selectedEmail}
          onClick={() => selectedEmail && onApprove(selectedEmail)}
          className={`px-4 py-2 text-sm text-white rounded-lg font-semibold transition-colors ${
            selectedEmail ? "hover:opacity-90" : "opacity-40 cursor-not-allowed"
          }`}
          style={{ background: BRAND_RED }}
        >
          Approve
        </button>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-16 text-slate-400">
      <Inbox size={40} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm">Nothing to review right now. The next sync will surface anything new.</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "connections" | "backfills";

export default function ReviewQueuePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("connections");
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const pendingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["review-queue"],
    queryFn: fetchQueue,
    refetchInterval: 60_000,
  });

  // ── Optimistic helpers ──────────────────────────────────────────────────────

  function startRemoving(id: string) {
    setRemovingIds(prev => new Set(prev).add(id));
    // Remove from cache after animation
    pendingTimeouts.current[id] = setTimeout(() => {
      queryClient.setQueryData<ReviewQueueData>(["review-queue"], old => {
        if (!old) return old;
        return {
          proposals: old.proposals.filter(p => p.id !== id),
          backfills: old.backfills.filter(b => b.contactId !== id),
        };
      });
      setRemovingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }, 300);
  }

  function rollback(id: string, errMsg: string) {
    clearTimeout(pendingTimeouts.current[id]);
    setRemovingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    setErrors(prev => ({ ...prev, [id]: errMsg }));
    queryClient.invalidateQueries({ queryKey: ["review-queue"] });
  }

  // ── Proposal mutations ──────────────────────────────────────────────────────

  const approveProposalMutation = useMutation({
    mutationFn: approveProposal,
    onMutate: (id) => startRemoving(id),
    onError: (_err, id) => rollback(id, _err instanceof Error ? _err.message : "Approve failed"),
  });

  const rejectProposalMutation = useMutation({
    mutationFn: rejectProposal,
    onMutate: (id) => startRemoving(id),
    onError: (_err, id) => rollback(id, _err instanceof Error ? _err.message : "Reject failed"),
  });

  // ── Backfill mutations ──────────────────────────────────────────────────────

  const approveBackfillMutation = useMutation({
    mutationFn: ({ contactId, email }: { contactId: string; email: string }) =>
      approveBackfill(contactId, email),
    onMutate: ({ contactId }) => startRemoving(contactId),
    onError: (_err, { contactId }) => rollback(contactId, _err instanceof Error ? _err.message : "Approve failed"),
  });

  const rejectBackfillMutation = useMutation({
    mutationFn: rejectBackfill,
    onMutate: (contactId) => startRemoving(contactId),
    onError: (_err, contactId) => rollback(contactId, _err instanceof Error ? _err.message : "Reject failed"),
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  const proposals = data?.proposals ?? [];
  const backfills = data?.backfills ?? [];
  const proposalCount = proposals.length;
  const backfillCount = backfills.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/sales"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Sales
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 font-[family-name:var(--font-poppins)]">
            Review queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Approve or reject suggestions from your calendar sync
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {([
            { key: "connections" as Tab, label: "Connections", count: proposalCount, icon: <Users size={14} /> },
            { key: "backfills" as Tab, label: "Email backfills", count: backfillCount, icon: <Mail size={14} /> },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? "border-red-600 text-red-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  tab === t.key ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : tab === "connections" ? (
          proposalCount === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {proposals.map(p => (
                <ConnectionCard
                  key={p.id}
                  proposal={p}
                  removing={removingIds.has(p.id)}
                  error={errors[p.id] ?? null}
                  onApprove={() => {
                    setErrors(prev => { const next = { ...prev }; delete next[p.id]; return next; });
                    approveProposalMutation.mutate(p.id);
                  }}
                  onReject={() => {
                    setErrors(prev => { const next = { ...prev }; delete next[p.id]; return next; });
                    rejectProposalMutation.mutate(p.id);
                  }}
                />
              ))}
            </div>
          )
        ) : (
          backfillCount === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {backfills.map(g => (
                <BackfillCard
                  key={g.contactId}
                  group={g}
                  removing={removingIds.has(g.contactId)}
                  error={errors[g.contactId] ?? null}
                  onApprove={(email) => {
                    setErrors(prev => { const next = { ...prev }; delete next[g.contactId]; return next; });
                    approveBackfillMutation.mutate({ contactId: g.contactId, email });
                  }}
                  onReject={() => {
                    setErrors(prev => { const next = { ...prev }; delete next[g.contactId]; return next; });
                    rejectBackfillMutation.mutate(g.contactId);
                  }}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
