import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_PATH = path.join(process.cwd(), "src/data/prospecting-history.json");

export async function GET() {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const secret = new URL(request.url).searchParams.get("secret");
    if (secret !== "norman-send-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { weekCommencing, scores } = body;

    if (!weekCommencing || !scores) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    let existing: any[] = [];
    try {
      const raw = fs.readFileSync(DATA_PATH, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      existing = [];
    }

    // Replace if week already exists, otherwise append
    const idx = existing.findIndex((w: any) => w.weekCommencing === weekCommencing);
    if (idx >= 0) {
      existing[idx] = { weekCommencing, scores };
    } else {
      existing.push({ weekCommencing, scores });
    }

    // Sort by date
    existing.sort((a: any, b: any) => new Date(a.weekCommencing).getTime() - new Date(b.weekCommencing).getTime());

    fs.writeFileSync(DATA_PATH, JSON.stringify(existing, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
