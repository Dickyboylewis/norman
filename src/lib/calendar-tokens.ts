import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = "/data/relationship-intel";
const TOKENS_FILE = path.join(DATA_DIR, "calendar-tokens.json");
const ALGORITHM = "aes-256-gcm";

// Fields that are encrypted at rest
interface SensitiveFields {
  refreshToken: string;
  accessToken: string;
  accessTokenExpiry: number;
  googleEmail: string;
}

// Per-director entry stored in the JSON file
interface DirectorEntry {
  encrypted: string; // AES-256-GCM ciphertext of SensitiveFields JSON
  connectedAt: string;
  lastSyncAt: string | null;
  calendarSyncToken: string | null;
}

// Public decrypted view returned to callers
export interface DirectorTokenData extends SensitiveFields {
  connectedAt: string;
  lastSyncAt: string | null;
  calendarSyncToken: string | null;
}

type TokensFile = Record<string, DirectorEntry>;

// ── Crypto helpers ────────────────────────────────────────────────────────────

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) throw new Error("TOKEN_ENCRYPTION_KEY env var is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  return key;
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

function decrypt(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// ── File I/O with old-format migration ───────────────────────────────────────

function readFile(): TokensFile {
  try {
    const raw = fs.readFileSync(TOKENS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: TokensFile = {};
    let needsMigration = false;

    for (const [name, entry] of Object.entries(parsed)) {
      if (typeof entry === "string") {
        // Old format: entire token object was one encrypted blob
        try {
          const old = JSON.parse(decrypt(entry)) as DirectorTokenData;
          result[name] = {
            encrypted: encrypt(JSON.stringify({
              refreshToken:      old.refreshToken,
              accessToken:       old.accessToken,
              accessTokenExpiry: old.accessTokenExpiry,
              googleEmail:       old.googleEmail,
            } as SensitiveFields)),
            connectedAt:       old.connectedAt,
            lastSyncAt:        old.lastSyncAt ?? null,
            calendarSyncToken: null,
          };
          needsMigration = true;
        } catch { /* skip corrupt entry */ }
      } else if (entry && typeof entry === "object") {
        result[name] = entry as DirectorEntry;
      }
    }

    if (needsMigration) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(result, null, 2), "utf8");
    }

    return result;
  } catch {
    return {};
  }
}

function writeFile(data: TokensFile): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getTokens(directorName: string): DirectorTokenData | null {
  const file = readFile();
  const entry = file[directorName];
  if (!entry) return null;
  try {
    const sensitive = JSON.parse(decrypt(entry.encrypted)) as SensitiveFields;
    return {
      ...sensitive,
      connectedAt:       entry.connectedAt,
      lastSyncAt:        entry.lastSyncAt,
      calendarSyncToken: entry.calendarSyncToken,
    };
  } catch {
    return null;
  }
}

export function setTokens(directorName: string, tokenData: DirectorTokenData): void {
  const file = readFile();
  const sensitive: SensitiveFields = {
    refreshToken:      tokenData.refreshToken,
    accessToken:       tokenData.accessToken,
    accessTokenExpiry: tokenData.accessTokenExpiry,
    googleEmail:       tokenData.googleEmail,
  };
  file[directorName] = {
    encrypted:         encrypt(JSON.stringify(sensitive)),
    connectedAt:       tokenData.connectedAt,
    lastSyncAt:        tokenData.lastSyncAt,
    calendarSyncToken: tokenData.calendarSyncToken,
  };
  writeFile(file);
}

export function clearTokens(directorName: string): void {
  const file = readFile();
  delete file[directorName];
  writeFile(file);
}

export function getAllConnectedDirectors(): string[] {
  const file = readFile();
  return Object.keys(file).filter(name => {
    const tokens = getTokens(name);
    return tokens !== null && !!tokens.refreshToken;
  });
}

// Updates only the plain-text sync metadata — does not re-encrypt sensitive fields.
export function updateSyncState(
  directorName: string,
  state: { lastSyncAt: string | null; calendarSyncToken: string | null },
): void {
  const file = readFile();
  const entry = file[directorName];
  if (!entry) return;
  file[directorName] = { ...entry, ...state };
  writeFile(file);
}

export async function refreshAccessTokenIfNeeded(directorName: string): Promise<string | null> {
  const data = getTokens(directorName);
  if (!data) return null;

  const FIVE_MIN = 5 * 60 * 1000;
  if (data.accessTokenExpiry > Date.now() + FIVE_MIN) {
    return data.accessToken;
  }

  const clientId     = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: data.refreshToken,
        grant_type:    "refresh_token",
      }),
    });
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;

    const updated: DirectorTokenData = {
      ...data,
      accessToken:       json.access_token,
      accessTokenExpiry: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    setTokens(directorName, updated);
    return json.access_token;
  } catch {
    return null;
  }
}
