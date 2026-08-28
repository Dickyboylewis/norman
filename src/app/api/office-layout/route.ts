import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { buildSeedLayout, validateOfficeLayout } from "@/lib/office-layout";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const LAYOUT_FILE = path.join(DATA_DIR, "office-layout.json");

export async function GET() {
  try {
    const raw = fs.readFileSync(LAYOUT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (validateOfficeLayout(parsed)) {
      return NextResponse.json(parsed);
    }
    console.error("office-layout.json failed validation, serving seed layout");
    return NextResponse.json(buildSeedLayout());
  } catch {
    return NextResponse.json(buildSeedLayout());
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

  if (!validateOfficeLayout(body)) {
    return NextResponse.json({ error: "Invalid layout shape" }, { status: 400 });
  }

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${LAYOUT_FILE}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(body, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, LAYOUT_FILE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("office-layout write error:", error);
    return NextResponse.json({ error: "Failed to save layout" }, { status: 500 });
  }
}
