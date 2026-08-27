import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD_ID = "1461714569";

export async function GET(request: Request) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json([]);
  }

  const query = `
    {
      boards(ids: ${CONTACTS_BOARD_ID}) {
        items_page(
          limit: 10,
          query_params: { rules: [{ column_id: "name", operator: contains_text, compare_value: [${JSON.stringify(q)}] }] }
        ) {
          items { id name }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,
        "API-Version": "2024-01",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    const items: { id: string; name: string }[] =
      data?.data?.boards?.[0]?.items_page?.items ?? [];
    return NextResponse.json(items.map((i) => ({ id: i.id, name: i.name })));
  } catch (error) {
    console.error("contacts-search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
