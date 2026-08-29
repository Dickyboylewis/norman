import { DESKS, PEOPLE, type Desk, type DeskRotation, type Facing } from "./office-data";

export interface LayoutDesk {
  id: string;
  x: number;
  y: number;
  zone: Desk["zone"];
  facing: Facing;
  rotation: DeskRotation;
  personId: string | null;
}

export interface LayoutPerson {
  id: string;
  name: string;
  label: string;
  email?: string;
  slackId?: string;
}

export interface OfficeLayout {
  desks: LayoutDesk[];
  people: LayoutPerson[];
}

const ZONES = new Set(["studio", "directors", "hotdesk"]);
const FACINGS = new Set(["n", "e", "s", "w"]);
const ROTATIONS = new Set([0, 90, 180, 270]);

function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  const first = words[0]?.[0]?.toUpperCase() ?? "";
  const second = words[1]?.[0]?.toUpperCase() ?? "";
  return first + second;
}

/** Emails derivable from the repo (the Monday email-to-director map). */
const KNOWN_EMAILS: Record<string, string> = {
  dicky: "dicky.lewis@white-red.co.uk",
  jesus: "jesus.jimenez@white-red.co.uk",
  joe: "joe.haire@white-red.co.uk",
};

/** The layout currently hard-coded in office-data.ts, as seed/fallback data. */
export function buildSeedLayout(): OfficeLayout {
  return {
    desks: DESKS.map(desk => ({
      id: desk.id,
      x: desk.x,
      y: desk.y,
      zone: desk.zone,
      facing: desk.facing,
      rotation: desk.rotation ?? 0,
      personId: PEOPLE.find(p => p.deskId === desk.id)?.id ?? null,
    })),
    people: PEOPLE.map(person => ({
      id: person.id,
      name: person.name,
      label: initialsOf(person.fullName),
      ...(KNOWN_EMAILS[person.id] ? { email: KNOWN_EMAILS[person.id] } : {}),
    })),
  };
}

export function validateOfficeLayout(input: unknown): input is OfficeLayout {
  if (typeof input !== "object" || input === null) return false;
  const layout = input as { desks?: unknown; people?: unknown };
  if (!Array.isArray(layout.desks) || !Array.isArray(layout.people)) return false;

  const personIds = new Set<string>();
  for (const person of layout.people) {
    if (typeof person !== "object" || person === null) return false;
    const p = person as Record<string, unknown>;
    if (typeof p.id !== "string" || !p.id) return false;
    if (typeof p.name !== "string" || typeof p.label !== "string") return false;
    if (p.email !== undefined && typeof p.email !== "string") return false;
    if (p.slackId !== undefined && typeof p.slackId !== "string") return false;
    if (personIds.has(p.id)) return false;
    personIds.add(p.id);
  }

  const deskIds = new Set<string>();
  for (const desk of layout.desks) {
    if (typeof desk !== "object" || desk === null) return false;
    const d = desk as Record<string, unknown>;
    if (typeof d.id !== "string" || !d.id) return false;
    if (deskIds.has(d.id)) return false;
    deskIds.add(d.id);
    if (typeof d.x !== "number" || !Number.isFinite(d.x)) return false;
    if (typeof d.y !== "number" || !Number.isFinite(d.y)) return false;
    if (typeof d.zone !== "string" || !ZONES.has(d.zone)) return false;
    if (typeof d.facing !== "string" || !FACINGS.has(d.facing)) return false;
    if (typeof d.rotation !== "number" || !ROTATIONS.has(d.rotation)) return false;
    if (d.personId !== null && (typeof d.personId !== "string" || !personIds.has(d.personId)))
      return false;
  }

  const assigned = new Set<string>();
  for (const desk of layout.desks as { personId: string | null }[]) {
    if (desk.personId === null) continue;
    if (assigned.has(desk.personId)) return false;
    assigned.add(desk.personId);
  }

  return true;
}
