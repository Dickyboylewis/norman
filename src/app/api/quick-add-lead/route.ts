import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LEADS_BOARD_ID = "1461714586";

// Column ids discovered from the Leads board (1461714586) on 2026-08-27:
//   lead_status         status          "Status"
//   lead_owner          people          "Owner"
//   date__1             date            "Created Date"
//   connect_boards5__1  board_relation  "Contacts" -> board 1461714569
const STATUS_COLUMN = "lead_status";
const OWNER_COLUMN = "lead_owner";
const CREATED_DATE_COLUMN = "date__1";
const CONTACTS_LINK_COLUMN = "connect_boards5__1";

// Exact labels configured on the lead_status column.
const ALLOWED_STATUSES = new Set([
  "New Lead",
  "Attempted to contact",
  "Needs followup",
  "Appointments",
]);

// Monday user ids discovered via { users { id name email } }.
const MONDAY_USER_BY_EMAIL: Record<string, number> = {
  "dicky.lewis@white-red.co.uk": 58965577,
  "jesus.jimenez@white-red.co.uk": 60328434,
  "joe.haire@white-red.co.uk": 60328447,
};

export async function POST(request: Request) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
  }

  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const mondayUserId = MONDAY_USER_BY_EMAIL[email];
  if (!mondayUserId) {
    return NextResponse.json(
      { error: `No Monday.com account is mapped for ${email} — only directors can create leads` },
      { status: 403 },
    );
  }

  let body: { status?: unknown; contactItemId?: unknown; contactName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : "";
  const contactItemId = typeof body.contactItemId === "string" ? body.contactItemId.trim() : "";
  const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";

  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Unknown status label" }, { status: 400 });
  }
  if (!/^\d+$/.test(contactItemId)) {
    return NextResponse.json({ error: "Invalid contact item id" }, { status: 400 });
  }
  if (!contactName || contactName.length > 255) {
    return NextResponse.json({ error: "Invalid contact name" }, { status: 400 });
  }

  const columnValues = {
    [STATUS_COLUMN]: { label: status },
    [OWNER_COLUMN]: { personsAndTeams: [{ id: mondayUserId, kind: "person" }] },
    [CREATED_DATE_COLUMN]: { date: new Date().toISOString().slice(0, 10) },
    [CONTACTS_LINK_COLUMN]: { item_ids: [Number(contactItemId)] },
  };

  const mutation = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
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
      body: JSON.stringify({
        query: mutation,
        variables: {
          boardId: LEADS_BOARD_ID,
          itemName: contactName,
          columnValues: JSON.stringify(columnValues),
        },
      }),
    });

    const data = await response.json();
    const itemId = data?.data?.create_item?.id;

    if (!itemId) {
      const detail =
        data?.errors?.map((e: { message?: string }) => e.message).join("; ") ??
        data?.error_message ??
        "Monday API returned no item id";
      console.error("quick-add-lead Monday error:", detail);
      return NextResponse.json({ error: detail }, { status: 500 });
    }

    return NextResponse.json({ success: true, itemId });
  } catch (error) {
    console.error("quick-add-lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
