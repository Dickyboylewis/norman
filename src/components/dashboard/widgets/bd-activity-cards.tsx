"use client";

import { useQuery } from "@tanstack/react-query";

const BRAND_RED = "#DA2C26";

export const BD_STATUSES = [
  { label: "New Lead", color: "#FDAB3D" },
  { label: "Attempted to Contact", color: "#FF9EB3" },
  { label: "Needs Follow-up", color: "#FF642E" },
  { label: "Appointments", color: "#9CD326" },
] as const;

interface CardCopy {
  title: string;
  intro: string;
  bullets: string[];
}

const CARDS: CardCopy[] = [
  {
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

function StatusButtonRow() {
  return (
    <div className="flex justify-center gap-3">
      {BD_STATUSES.map((status) => (
        <button
          key={status.label}
          type="button"
          title={status.label}
          aria-label={status.label}
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
  return (
    <div className="flex flex-col rounded-3xl border-2 bg-white p-6 shadow-sm" style={{ borderColor: BRAND_RED }}>
      <div className="relative mb-4">
        <h3
          className="pr-16 text-xl font-bold font-[family-name:var(--font-poppins)]"
          style={{ color: BRAND_RED }}
        >
          {card.title}
        </h3>
        <button
          type="button"
          aria-label="Start 30-minute focus timer"
          className="absolute right-0 top-0 flex h-14 w-14 items-center justify-center rounded-full text-[10px] font-bold leading-tight text-white shadow-md transition-transform hover:scale-105"
          style={{ backgroundColor: BRAND_RED }}
        >
          Let&rsquo;s go!!
        </button>
      </div>

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
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <BDCard card={CARDS[0]} footer={<StatusButtonRow />} />
      <BDCard card={CARDS[1]} footer={<StatusButtonRow />} />
      <BDCard card={CARDS[2]} footer={<ContactsListButton />} />
    </div>
  );
}
