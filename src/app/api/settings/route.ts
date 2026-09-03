import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { DEFAULT_APP_SETTINGS, validateAppSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "app-settings.json");

export async function GET() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (validateAppSettings(parsed)) {
      return NextResponse.json(parsed);
    }
    console.error("app-settings.json failed validation, serving defaults");
    return NextResponse.json(DEFAULT_APP_SETTINGS);
  } catch {
    return NextResponse.json(DEFAULT_APP_SETTINGS);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!validateAppSettings(body)) {
    return NextResponse.json({ error: "Invalid settings shape" }, { status: 400 });
  }

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${SETTINGS_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(body, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, SETTINGS_FILE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("app-settings write error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
