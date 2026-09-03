/**
 * Project colour system — server half.
 *
 * getProjectColorMap() persists a stable code-to-hex assignment in
 * data/project-colors.json so every project keeps one colour for life,
 * consistent across every chart and page. API routes call it and attach a
 * `color` field to each project object; the server is the single place
 * colours are decided.
 */
import fs from "fs";
import path from "path";
import { PROJECT_PALETTE } from "./project-colors";

const DATA_DIR = path.join(process.cwd(), "data");
const COLORS_FILE = path.join(DATA_DIR, "project-colors.json");

/** Overflow palettes lighten by this per pass once all 24 base colours are used. */
const OVERFLOW_LIGHTEN_STEP = 0.15;
const MAX_OVERFLOW_LEVELS = 5;

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
    .map((c) => mix(c).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function readColorFile(): Record<string, string> {
  try {
    const parsed = JSON.parse(fs.readFileSync(COLORS_FILE, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const map: Record<string, string> = {};
    for (const [code, color] of Object.entries(parsed)) {
      if (typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)) map[code] = color;
    }
    return map;
  } catch {
    writeColorFile({});
    return {};
  }
}

function writeColorFile(map: Record<string, string>): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${COLORS_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(map, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, COLORS_FILE);
}

function nextFreeColor(used: Set<string>): string {
  for (let level = 0; level <= MAX_OVERFLOW_LEVELS; level++) {
    for (const base of PROJECT_PALETTE) {
      const candidate = level === 0 ? base : lighten(base, OVERFLOW_LIGHTEN_STEP * level);
      if (!used.has(candidate)) return candidate;
    }
  }
  return "#9CA3AF";
}

/**
 * Returns the persisted code-to-hex map, assigning the first free palette
 * colour to any code not yet present and writing the file back. Sub-project
 * codes such as "5537/1" are separate projects with their own colour.
 */
export async function getProjectColorMap(codes: string[]): Promise<Record<string, string>> {
  const map = readColorFile();
  const used = new Set(Object.values(map));
  let changed = false;
  for (const code of codes) {
    if (!code || map[code]) continue;
    const color = nextFreeColor(used);
    map[code] = color;
    used.add(color);
    changed = true;
  }
  if (changed) writeColorFile(map);
  return map;
}
