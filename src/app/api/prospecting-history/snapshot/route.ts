import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_PATH = path.join(process.cwd(), "src/data/prospecting-history.json");

const WEIGHTS: Record<string, number> = {
  "New Lead": 0,
  "Attempted to Contact": 1,
  "Needs Follow up": 2,
  "Appointments": 5,
};

function getCurrentWeekCommencing(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const secret = searchParams.get("secret");
    if (secret !== "norman-send-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekParam = searchParams.get("week");
    const weekCommencing = weekParam || getCurrentWeekCommencing();

    const joeManual = searchParams.get("joe");
    const jesusManual = searchParams.get("jesus");
    const dickyManual = searchParams.get("dicky");

    let scores: Record<string, number>;

    if (joeManual !== null && jesusManual !== null && dickyManual !== null) {
      scores = {
        "Joe Haire": Number(joeManual),
        "Jesus Jimenez": Number(jesusManual),
        "Dicky Lewis": Number(dickyManual),
      };
    } else {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const mondayRes = await fetch(`${baseUrl}/api/monday`, { cache: "no-store" });
      const mondayData = await mondayRes.json();

      if (!Array.isArray(mondayData)) {
        return NextResponse.json({ error: "Invalid Monday data" }, { status: 500 });
      }

      scores = {};
      mondayData.forEach((entry: any) => {
        const name = entry.name;
        const total =
          (entry["New Lead"] ?? 0) * WEIGHTS["New Lead"] +
          (entry["Attempted to Contact"] ?? 0) * WEIGHTS["Attempted to Contact"] +
          (entry["Needs Follow up"] ?? 0) * WEIGHTS["Needs Follow up"] +
          (entry["Appointments"] ?? 0) * WEIGHTS["Appointments"];
        scores[name] = total;
      });
    }

    let history: any[] = [];
    try {
      const raw = fs.readFileSync(DATA_PATH, "utf-8");
      history = JSON.parse(raw);
    } catch {
      const dataDir = path.dirname(DATA_PATH);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    }

    const existingIndex = history.findIndex((h: any) => h.weekCommencing === weekCommencing);
    const newRecord = { weekCommencing, scores };

    if (existingIndex >= 0) {
      history[existingIndex] = newRecord;
    } else {
      history.push(newRecord);
    }

    history.sort(
      (a: any, b: any) =>
        new Date(a.weekCommencing).getTime() - new Date(b.weekCommencing).getTime()
    );

    fs.writeFileSync(DATA_PATH, JSON.stringify(history, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      weekCommencing,
      scores,
      action: existingIndex >= 0 ? "updated" : "created",
    });
  } catch (err: any) {
    console.error("[prospecting-history/snapshot] error:", err);
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
