/**
 * Project colour system — client-safe half.
 *
 * Colours are assigned server-side by getProjectColorMap() in
 * project-colors-server.ts, persisted in data/project-colors.json, and
 * attached to API responses as a `color` field. Components read that field;
 * fallbackProjectColor() covers rows a colour has not been supplied for.
 *
 * The palette holds 24 hues 15 degrees apart at medium saturation and mid
 * lightness. The array is ordered with a stride of seven positions (105
 * degree hue jumps), and hue-neighbours alternate lightness, so the first N
 * assigned colours are always maximally distinct from each other.
 */
export const PROJECT_PALETTE = [
  "#AB2121",
  "#62C940",
  "#2875C3",
  "#C658AA",
  "#979717",
  "#40C9A7",
  "#7528C3",
  "#C96240",
  "#21AB21",
  "#5A77CE",
  "#B52C70",
  "#9ABE2D",
  "#21ABAB",
  "#AA58C6",
  "#AB6621",
  "#40C962",
  "#2828C3",
  "#C94062",
  "#579717",
  "#5AB1CE",
  "#B52CB5",
  "#BE9A2D",
  "#21AB66",
  "#775ACE",
];

const FALLBACK_GREY = "#9CA3AF";

/** Neutral grey for rows whose API response carried no colour. */
export function fallbackProjectColor(code: string): string {
  void code;
  return FALLBACK_GREY;
}

/** Deterministic person colour, hashed from the userId into the palette. */
export function getPersonColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return PROJECT_PALETTE[hash % PROJECT_PALETTE.length];
}
