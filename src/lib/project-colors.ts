/**
 * Project colour system — client-safe half.
 *
 * Colours are assigned server-side by getProjectColorMap() in
 * project-colors-server.ts, persisted in data/project-colors.json, and
 * attached to API responses as a `color` field. Components read that field;
 * fallbackProjectColor() covers rows a colour has not been supplied for.
 *
 * The palette is a hand-picked set of 20 colours chosen for maximum mutual
 * distinctness, in assignment order.
 */
export const PROJECT_PALETTE = [
  "#E6194B",
  "#3CB44B",
  "#4363D8",
  "#F58231",
  "#911EB4",
  "#42D4F4",
  "#F032E6",
  "#BFEF45",
  "#FABED4",
  "#469990",
  "#DCBEFF",
  "#9A6324",
  "#FFFAC8",
  "#800000",
  "#AAFFC3",
  "#808000",
  "#FFD8B1",
  "#000075",
  "#A9A9A9",
  "#FFE119",
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
