import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ACCOUNTS_BOARD_ID = 1461714573;

async function archiveItem(apiKey: string, boardId: number, itemId: string): Promise<void> {
  const mutation = `mutation { archive_item(item_id: ${itemId}) { id } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query: mutation }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || `Archive failed on board ${boardId}`);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { accountId, archiveContacts, contactIds } = await request.json();
    if (!accountId)
      return NextResponse.json({ error: "Missing accountId" }, { status: 400 });

    let contactsArchived = 0;
    const errors: string[] = [];

    if (archiveContacts && Array.isArray(contactIds) && contactIds.length > 0) {
      for (const contactId of contactIds) {
        try {
          await archiveItem(apiKey, 1461714569, contactId);
          contactsArchived++;
        } catch (e) {
          errors.push(`Contact ${contactId}: ${e instanceof Error ? e.message : "unknown"}`);
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }

    await archiveItem(apiKey, ACCOUNTS_BOARD_ID, accountId);

    return NextResponse.json({
      success: true,
      accountId,
      contactsArchived,
      contactsOrphaned: archiveContacts ? 0 : (Array.isArray(contactIds) ? contactIds.length : 0),
      errors,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
