import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD_ID = 1461714569;

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { contactId, tag } = await request.json();
    if (!contactId) return NextResponse.json({ error: "Missing contactId" }, { status: 400 });

    const valueJson = tag ? JSON.stringify({ label: tag }) : "{}";
    const escapedValue = JSON.stringify(valueJson);
    const query = `mutation { change_column_value(item_id: ${contactId}, board_id: ${CONTACTS_BOARD_ID}, column_id: "color_mm37sdf", value: ${escapedValue}) { id } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    if (data.errors) return NextResponse.json({ error: data.errors[0]?.message || "Update failed" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
