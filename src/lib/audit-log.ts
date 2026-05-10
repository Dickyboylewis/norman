import fs from "fs";
import path from "path";

const DATA_DIR = "/data/relationship-intel";
const AUDIT_FILE = path.join(DATA_DIR, "review-audit.log");

export function appendAuditLog(directorName: string, action: string, details: string): void {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} | ${directorName} | ${action} | ${details}\n`;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(AUDIT_FILE, line, "utf8");
  } catch { /* best effort */ }
}
