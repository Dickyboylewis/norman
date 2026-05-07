import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD_ID = 1461714569;

interface CachedContact {
  id: string;
  name: string;
  company: string;
  director: string;
}

let contactCache: CachedContact[] = [];
let contactCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 10;

async function loadContacts(apiKey: string) {
  if (Date.now() - contactCacheTime < CACHE_TTL && contactCache.length > 0) return;

  // Paginate with cursor to handle large boards
  const items: CachedContact[] = [];
  let cursor: string | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pageArg: string = cursor ? `limit: 250, cursor: "${cursor}"` : `limit: 250`;
    const gql: string = `query {
      boards(ids: [${CONTACTS_BOARD_ID}]) {
        items_page(${pageArg}) {
          cursor
          items {
            id
            name
            column_values(ids: ["text8", "people__1"]) {
              id
              text
            }
          }
        }
      }
    }`;

    const res: Response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: gql }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const page = json.data?.boards?.[0]?.items_page;
    cursor = page?.cursor ?? null;

    const pageItems: { id: string; name: string; column_values: { id: string; text: string }[] }[] = page?.items ?? [];
    for (const item of pageItems) {
      const text8 = item.column_values?.find(c => c.id === "text8")?.text || "";
      const people = item.column_values?.find(c => c.id === "people__1")?.text || "";
      items.push({ id: item.id, name: item.name, company: text8, director: people.toLowerCase() });
    }

    if (!cursor) break;
  }

  contactCache = items;
  contactCacheTime = Date.now();
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const q = (request.nextUrl.searchParams.get("q") || "").toLowerCase().trim();
  const director = (request.nextUrl.searchParams.get("director") || "").toLowerCase().trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20", 10), 50);

  if (!q) return NextResponse.json({ contacts: [] });

  try {
    await loadContacts(apiKey);

    const scored = contactCache
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
        return { id: c.id, name: c.name, company: c.company, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score: _score, ...rest }) => rest);

    return NextResponse.json({ contacts: scored });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
