import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { contactId, note, author = "Dicky" } = await request.json();
    if (!contactId || !note) return NextResponse.json({ error: "Missing contactId or note" }, { status: 400 });

    // Step 1 — fetch existing notes
    const fetchQuery = `query { items(ids: [${contactId}]) { column_values(ids: ["long_text4"]) { text } } }`;
    const fetchRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: fetchQuery }),
    });
    const fetchData = await fetchRes.json();
    const existing = fetchData.data?.items?.[0]?.column_values?.[0]?.text || "";

    // Step 2 — build new note with timestamp prefix
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const prefix = `[${dd}/${mm}/${yyyy} ${hh}:${min}] (${author}): `;
    const combined = `${prefix}${note.trim()}${existing ? "\n\n" + existing : ""}`;

    // Step 3 — write back
    const escapedValue = JSON.stringify(combined);
    const updateQuery = `mutation { change_simple_column_value(item_id: ${contactId}, board_id: 1461714569, column_id: "long_text4", value: ${escapedValue}) { id } }`;
    const updateRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: updateQuery }),
    });
    const updateData = await updateRes.json();
    if (updateData.errors) {
      console.error("Monday note error:", updateData.errors);
      return NextResponse.json({ error: updateData.errors[0]?.message || "Update failed" }, { status: 500 });
    }
    return NextResponse.json({ success: true, combined });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
