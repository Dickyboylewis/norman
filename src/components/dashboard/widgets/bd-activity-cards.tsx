"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getDirectorByEmail } from "@/lib/directors";
import { QuickAddLeadModal } from "./quick-add-lead-modal";

const BRAND_RED = "#DA2C26";
const DONE_GREEN = "#16A34A";
const FOCUS_MINUTES = 30;
const CANCEL_PROMPT = "Cancel this timer?";
const CHIME_FREQS: [number, number] = [880, 1320];

// Labels must exactly match the lead_status column on Monday Leads board 1461714586.
export const BD_STATUSES = [
  { label: "New Lead", color: "#FDAB3D" },
  { label: "Attempted to contact", color: "#FF9EB3" },
  { label: "Needs followup", color: "#FF642E" },
  { label: "Appointments", color: "#9CD326" },
] as const;

type BdSessionType = "core" | "stretch" | "bd500";

interface BdSessionRecord {
  id: string;
  name: string;
  type: BdSessionType;
  startedAt: string;
  endsAt: string;
  completedAt: string | null;
}

interface BdSessionsResponse {
  sessions: Record<string, BdSessionRecord[]>;
}

interface CardCopy {
  id: string;
  title: string;
  intro: string;
  bullets: string[];
}

const CARDS: CardCopy[] = [
  {
    id: "core",
    title: "BD Core",
    intro:
      "Keep the landlord engine warm: the right people in the ecosystem hear from us every week, with a reason.",
    bullets: [
      "Open Monday.com — CRM + Leads boards",
      "Pick 4–5 names from the 500: rotate a zone, mix of agents / consultants / clients",
      "One line per name — why this person, this week: something's happened (signal), it's been too long (lapsed), a live pitch needs a nudge, or an intro needs chasing. Can't write the line? Drop the name.",
      "Send the outreach / push-along messages there and then",
      "1–2 quick keep-in-touch calls — voicemail counts",
      "Book anything deeper (coffee, lunch, proper call) into Tues–Thurs before closing",
      "Drop a line per touch into the week's BD log for Friday's CRM update",
    ],
  },
  {
    id: "stretch",
    title: "BD Stretch",
    intro:
      "Open the occupier market and the networks that route international — the new territory the brand grows into.",
    bullets: [
      "Open the occupier / stretch pipeline in Monday.com",
      "Pick 2–3 occupier or occupier-agent names, one line each on why now",
      "Send the messages / intro asks now",
      "Nudge one live occupier lead forward — chase, share something, set next step",
      "One journalist relationship touch: note or coffee ask, not a pitch",
      "Flag any international routing angle in the log",
      "Book meetings into the diary before closing",
    ],
  },
  {
    id: "500",
    title: "BD 500",
    intro:
      "Sharpen the map, not the phone: comb and upgrade the 500 people who can commission the work we aspire to, so next week's calls come from a list, not from memory.",
    bullets: [
      "Open the 500 list, comb one segment (15–20 rows): verify names and roles, tag know / one-hop (+ who owns the hop) / never",
      "Run one research lens on rotation: CoStar zone sweep, AI extraction (paste EG headlines / CoStar notes / transcripts into Claude to pull names and signals), press mining, reverse-engineer a building, competitor client mapping, one-hop LinkedIn pass, job moves",
      "Add missing buyers, retire dead rows — one in, one out at 500",
      "Feed 2–3 warm names with reasons into next Monday's Core and Stretch plans",
    ],
  },
];

const TYPE_BY_CARD_ID: Record<string, BdSessionType> = {
  core: "core",
  stretch: "stretch",
  "500": "bd500",
};

function useBdSessions() {
  return useQuery<BdSessionsResponse>({
    queryKey: ["bd-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/bd-sessions");
      if (!res.ok) throw new Error("Failed to fetch BD sessions");
      return res.json();
    },
    refetchInterval: 300_000,
    retry: 1,
  });
}

function useDirectorName(): string | null {
  const { data } = useSession();
  const email = data?.user?.email;
  return email ? getDirectorByEmail(email)?.name ?? null : null;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playChime(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  CHIME_FREQS.forEach((freq, i) => {
    const offset = i * 0.3;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + offset + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.3);
  });
}

type TimerPhase = "idle" | "running" | "done";

function FocusTimerButton({ type, cardTitle }: { type: BdSessionType; cardTitle: string }) {
  const queryClient = useQueryClient();
  const directorName = useDirectorName();
  const { data: sessionsData } = useBdSessions();
  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [remainingMs, setRemainingMs] = useState(FOCUS_MINUTES * 60 * 1000);
  const activeRef = useRef<{ id: string; endsAt: number } | null>(null);
  const completedPostedRef = useRef<string | null>(null);
  const resumedRef = useRef(false);
  const startingRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (resumedRef.current || !sessionsData || !directorName) return;
    resumedRef.current = true;
    const now = Date.now();
    const open = (sessionsData.sessions[directorName] ?? []).find(
      (s) => s.type === type && s.completedAt === null && Date.parse(s.endsAt) > now,
    );
    if (open) {
      activeRef.current = { id: open.id, endsAt: Date.parse(open.endsAt) };
      setRemainingMs(Date.parse(open.endsAt) - now);
      setPhase("running");
    }
  }, [sessionsData, directorName, type]);

  useEffect(() => {
    if (phase !== "running") return;
    const complete = () => {
      const active = activeRef.current;
      if (active && completedPostedRef.current !== active.id) {
        completedPostedRef.current = active.id;
        void fetch("/api/bd-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", id: active.id }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Complete failed: ${res.status}`);
          })
          .catch((error) => console.error("BD session complete failed:", error))
          .finally(() => void queryClient.invalidateQueries({ queryKey: ["bd-sessions"] }));
      }
      activeRef.current = null;
      setPhase("done");
      try {
        if (!audioRef.current && typeof window !== "undefined" && window.AudioContext) {
          audioRef.current = new window.AudioContext();
        }
        const ctx = audioRef.current;
        if (ctx) {
          if (ctx.state === "suspended") void ctx.resume();
          playChime(ctx);
        }
      } catch {
        /* audio unavailable */
      }
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`30 minutes done — ${cardTitle}`);
        }
      } catch {
        /* notifications unavailable */
      }
    };
    const tick = () => {
      const rem = (activeRef.current?.endsAt ?? 0) - Date.now();
      if (rem <= 0) complete();
      else setRemainingMs(rem);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase, cardTitle, queryClient]);

  const handleClick = () => {
    if (phase === "running") {
      if (window.confirm(CANCEL_PROMPT)) {
        activeRef.current = null;
        setPhase("idle");
        setRemainingMs(FOCUS_MINUTES * 60 * 1000);
      }
      return;
    }
    if (phase === "done") {
      setPhase("idle");
      setRemainingMs(FOCUS_MINUTES * 60 * 1000);
      return;
    }
    if (startingRef.current) return;
    try {
      if (window.AudioContext) {
        if (!audioRef.current) audioRef.current = new window.AudioContext();
        if (audioRef.current.state === "suspended") void audioRef.current.resume();
      }
    } catch {
      /* audio unavailable */
    }
    startingRef.current = true;
    resumedRef.current = true;
    void (async () => {
      try {
        const res = await fetch("/api/bd-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", type, durationMinutes: FOCUS_MINUTES }),
        });
        if (!res.ok) throw new Error(`Start failed: ${res.status}`);
        const body: { session: BdSessionRecord } = await res.json();
        const endsAt = Date.parse(body.session.endsAt);
        activeRef.current = { id: body.session.id, endsAt };
        setRemainingMs(endsAt - Date.now());
        setPhase("running");
        void queryClient.invalidateQueries({ queryKey: ["bd-sessions"] });
      } catch (error) {
        console.error("BD session start failed:", error);
        window.alert("Could not start the timer. Sign in as a director and try again.");
      } finally {
        startingRef.current = false;
      }
    })();
  };

  const label =
    phase === "running"
      ? formatRemaining(remainingMs)
      : phase === "done"
        ? "Completed"
        : "Let’s go!!";
  const ariaLabel =
    phase === "running"
      ? "Cancel focus timer"
      : phase === "done"
        ? "Clear finished focus timer"
        : "Start 30-minute focus timer";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`absolute right-0 top-0 flex h-14 w-14 items-center justify-center rounded-full font-bold text-white shadow-md transition-transform hover:scale-105 ${
        phase === "running" ? "text-xs tabular-nums" : "text-[10px] leading-tight"
      }`}
      style={{ backgroundColor: phase === "done" ? DONE_GREEN : BRAND_RED }}
    >
      {label}
    </button>
  );
}

const LONDON_DAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
});

const LONDON_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function SessionHistoryLine({ type }: { type: BdSessionType }) {
  const directorName = useDirectorName();
  const { data } = useBdSessions();
  if (!directorName || !data) return null;

  const mine = (data.sessions[directorName] ?? [])
    .filter((s) => s.type === type)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  if (mine.length === 0) return null;

  return (
    <p className="-mt-2 mb-3 text-[11px] leading-relaxed text-gray-400">
      {mine
        .map((s) => {
          const start = new Date(s.startedAt);
          const end = new Date(s.endsAt);
          const mark = s.completedAt ? "✓" : "○";
          return `${mark} ${LONDON_DAY.format(start)} ${LONDON_TIME.format(start)} – ${LONDON_TIME.format(end)}`;
        })
        .join(" · ")}
    </p>
  );
}

interface StatusPick {
  label: string;
  color: string;
}

function StatusButtonRow({ onPick }: { onPick: (pick: StatusPick) => void }) {
  return (
    <div className="flex justify-center gap-3">
      {BD_STATUSES.map((status) => (
        <button
          key={status.label}
          type="button"
          title={status.label}
          aria-label={`Add ${status.label} lead`}
          onClick={() => onPick({ label: status.label, color: status.color })}
          className="w-11 h-11 rounded-lg shadow-sm transition-transform hover:scale-105"
          style={{ backgroundColor: status.color }}
        />
      ))}
    </div>
  );
}

function ContactsListButton() {
  const { data } = useQuery<{ url: string }>({
    queryKey: ["board-url", "contacts"],
    queryFn: async () => {
      const res = await fetch("/api/board-url?board=contacts");
      if (!res.ok) throw new Error("Failed to fetch board url");
      return res.json();
    },
    staleTime: Infinity,
  });

  const url = data?.url;

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={!url}
      className={`block w-full rounded-lg py-3 text-center text-sm font-semibold text-white transition-opacity ${
        url ? "hover:opacity-90" : "pointer-events-none opacity-50"
      }`}
      style={{ backgroundColor: "#79C3E6" }}
    >
      Open Monday Contacts List
    </a>
  );
}

function BDCard({ card, footer }: { card: CardCopy; footer: React.ReactNode }) {
  const type = TYPE_BY_CARD_ID[card.id];
  return (
    <div className="flex flex-col rounded-3xl border-2 bg-white p-6 shadow-sm" style={{ borderColor: BRAND_RED }}>
      <div className="relative mb-4">
        <h3
          className="pr-16 text-xl font-bold font-[family-name:var(--font-poppins)]"
          style={{ color: BRAND_RED }}
        >
          {card.title}
        </h3>
        <FocusTimerButton type={type} cardTitle={card.title} />
      </div>

      <SessionHistoryLine type={type} />

      <p className="mb-3 text-sm font-medium" style={{ color: BRAND_RED }}>
        {card.intro}
      </p>

      <ul
        className="mb-6 flex-1 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed marker:text-[#DA2C26]"
        style={{ color: BRAND_RED }}
      >
        {card.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>

      {footer}
    </div>
  );
}

export function BDActivityCards() {
  const [pick, setPick] = useState<StatusPick | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <BDCard card={CARDS[0]} footer={<StatusButtonRow onPick={setPick} />} />
        <BDCard card={CARDS[1]} footer={<StatusButtonRow onPick={setPick} />} />
        <BDCard card={CARDS[2]} footer={<ContactsListButton />} />
      </div>
      <QuickAddLeadModal
        open={pick !== null}
        onOpenChange={(open) => {
          if (!open) setPick(null);
        }}
        status={pick?.label ?? ""}
        statusColor={pick?.color ?? BRAND_RED}
      />
    </>
  );
}
