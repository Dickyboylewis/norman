import { NextRequest, NextResponse } from "next/server";
import { ensureLogoColumns } from "@/lib/monday-columns";

export const dynamic = "force-dynamic";

const ACCOUNTS_BOARD_ID = 1461714573;

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { accountId, logoUrl } = await request.json();
    if (!accountId || !logoUrl)
      return NextResponse.json({ error: "Missing accountId or logoUrl" }, { status: 400 });

    await new Promise(r => setTimeout(r, 100));

    const columnIds = await ensureLogoColumns(apiKey);

    const colVals: Record<string, string> = {
      [columnIds.logoUrlColId]: logoUrl,
      [columnIds.logoSourceColId]: "manual",
    };
    const escapedColVals = JSON.stringify(JSON.stringify(colVals));
    const query = `mutation { change_multiple_column_values(item_id: ${accountId}, board_id: ${ACCOUNTS_BOARD_ID}, column_values: ${escapedColVals}) { id } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
        "API-Version": "2024-01",
      },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (data.errors)
      return NextResponse.json(
        { error: data.errors[0]?.message || "Update failed" },
        { status: 500 },
      );

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
