import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = "/data/relationship-intel";
const TOKENS_FILE = path.join(DATA_DIR, "calendar-tokens.json");
const ALGORITHM = "aes-256-gcm";

export interface DirectorTokenData {
  refreshToken: string;
  accessToken: string;
  accessTokenExpiry: number;
  googleEmail: string;
  connectedAt: string;
  lastSyncAt: string | null;
}

type TokensFile = Record<string, string>; // directorName → encrypted JSON

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

function readFile(): TokensFile {
  try {
    const raw = fs.readFileSync(TOKENS_FILE, "utf8");
    return JSON.parse(raw) as TokensFile;
  } catch {
    return {};
  }
}

function writeFile(data: TokensFile): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function getTokens(directorName: string): DirectorTokenData | null {
  const file = readFile();
  const encrypted = file[directorName];
  if (!encrypted) return null;
  try {
    return JSON.parse(decrypt(encrypted)) as DirectorTokenData;
  } catch {
    return null;
  }
}

export function setTokens(directorName: string, tokenData: DirectorTokenData): void {
  const file = readFile();
  file[directorName] = encrypt(JSON.stringify(tokenData));
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
    const data = getTokens(name);
    return data !== null && !!data.refreshToken;
  });
}

export async function refreshAccessTokenIfNeeded(directorName: string): Promise<string | null> {
  const data = getTokens(directorName);
  if (!data) return null;

  const FIVE_MIN = 5 * 60 * 1000;
  if (data.accessTokenExpiry > Date.now() + FIVE_MIN) {
    return data.accessToken;
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: data.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!json.access_token) return null;

    const updated: DirectorTokenData = {
      ...data,
      accessToken: json.access_token,
      accessTokenExpiry: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    setTokens(directorName, updated);
    return json.access_token;
  } catch {
    return null;
  }
}
