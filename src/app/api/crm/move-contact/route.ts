import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD_ID = 1461714569;
const ACCOUNT_COL = "board_relation5";

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { contactId, newAccountId } = await request.json();
    if (!contactId || !newAccountId)
      return NextResponse.json({ error: "Missing contactId or newAccountId" }, { status: 400 });

    // Discover the account relation column ID
    const schemaQuery = `query { boards(ids: [${CONTACTS_BOARD_ID}]) { columns { id title type } } }`;
    const schemaRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query: schemaQuery }),
    });
    const schemaData = await schemaRes.json();
    const cols: { id: string; title: string; type: string }[] =
      schemaData.data?.boards?.[0]?.columns || [];

    // Find the board_relation column that links to accounts (title contains "company" or "account")
    let accountColId = ACCOUNT_COL;
    const relCol = cols.find(c =>
      c.type === "board_relation" &&
      (c.title.toLowerCase().includes("company") || c.title.toLowerCase().includes("account"))
    );
    if (relCol) accountColId = relCol.id;

    const valueJson = JSON.stringify({ item_ids: [Number(newAccountId)] });
    const escapedValue = JSON.stringify(valueJson);
    const mutation = `mutation { change_column_value(item_id: ${contactId}, board_id: ${CONTACTS_BOARD_ID}, column_id: "${accountColId}", value: ${escapedValue}) { id } }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query: mutation }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message || "Monday write failed");

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
