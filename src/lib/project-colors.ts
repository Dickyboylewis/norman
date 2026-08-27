/**
 * Shared project colour assignment. A project code hashes to one of ~10
 * distinct, accessible colours so the same project renders identically on the
 * resourcing page, the office diagram, and anywhere else.
 */
export const PROJECT_PALETTE = [
  "#2563EB",
  "#0D9488",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#DB2777",
  "#65A30D",
  "#0891B2",
  "#4F46E5",
  "#B45309",
];

export function projectColor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return PROJECT_PALETTE[hash % PROJECT_PALETTE.length];
}

/** Same hashing approach, applied to a person's userId. */
export function getPersonColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return PROJECT_PALETTE[hash % PROJECT_PALETTE.length];
}
