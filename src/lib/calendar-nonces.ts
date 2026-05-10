import crypto from "crypto";

interface NonceEntry {
  directorName: string;
  expiresAt: number;
}

const nonceStore = new Map<string, NonceEntry>();
const NONCE_TTL = 10 * 60 * 1000; // 10 minutes

function pruneNonces() {
  const now = Date.now();
  for (const [nonce, entry] of nonceStore.entries()) {
    if (entry.expiresAt < now) nonceStore.delete(nonce);
  }
}

export function createNonce(directorName: string): string {
  pruneNonces();
  const nonce = crypto.randomBytes(16).toString("hex");
  nonceStore.set(nonce, { directorName, expiresAt: Date.now() + NONCE_TTL });
  return nonce;
}

export function consumeNonce(nonce: string): string | null {
  pruneNonces();
  const entry = nonceStore.get(nonce);
  if (!entry || entry.expiresAt < Date.now()) {
    nonceStore.delete(nonce);
    return null;
  }
  nonceStore.delete(nonce);
  return entry.directorName;
}
