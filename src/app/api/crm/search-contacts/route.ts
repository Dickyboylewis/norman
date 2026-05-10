import { NextRequest, NextResponse } from "next/server";
import { loadContactCache, getContactCache } from "@/lib/contacts-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const q = (request.nextUrl.searchParams.get("q") || "").toLowerCase().trim();
  const director = (request.nextUrl.searchParams.get("director") || "").toLowerCase().trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20", 10), 50);

  if (!q) return NextResponse.json({ contacts: [] });

  try {
    await loadContactCache(apiKey);
    const cache = getContactCache();

    const scored = cache
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
      )
      .map(c => {
        let score = 0;
        const nameLower = c.name.toLowerCase();
        const companyLower = c.company.toLowerCase();
        if (nameLower.startsWith(q)) score += 10;
        else if (nameLower.includes(q)) score += 5;
        if (companyLower.startsWith(q)) score += 4;
        else if (companyLower.includes(q)) score += 2;
        if (director && c.director.includes(director)) score += 3;
        return { id: c.id, name: c.name, company: c.company, position: c.position, accountId: c.accountId, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score: _score, ...rest }) => rest);

    return NextResponse.json({ contacts: scored });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
