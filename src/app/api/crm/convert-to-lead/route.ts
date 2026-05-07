import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LEADS_BOARD_ID = 1461714586;
const NEW_LEADS_GROUP_FALLBACK = "topics";

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const { contactId, contactName, contactEmail, contactPhone, companyName, contactPosition } = await request.json();
    if (!contactId || !contactName) return NextResponse.json({ error: "Missing contactId or contactName" }, { status: 400 });

    // Look up the actual New Leads group ID dynamically
    const groupsQuery = `query { boards(ids: [${LEADS_BOARD_ID}]) { groups { id title } } }`;
    const groupsRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: groupsQuery }),
    });
    const groupsData = await groupsRes.json();
    const newLeadsGroup = groupsData.data?.boards?.[0]?.groups?.find(
      (g: { title: string }) => g.title.toLowerCase().includes("new lead")
    );
    const groupId = newLeadsGroup?.id || NEW_LEADS_GROUP_FALLBACK;

    // Build the lead title: "Name - Company"
    const leadTitle = companyName ? `${contactName} - ${companyName}` : contactName;

    // Column values — link back to the Contact item
    const columnValues: Record<string, unknown> = {
      connect_boards5__1: { item_ids: [parseInt(contactId, 10)] },
    };
    if (contactEmail) columnValues["email"] = { email: contactEmail, text: contactEmail };
    if (contactPhone) columnValues["phone"] = { phone: contactPhone, countryShortName: "GB" };
    if (contactPosition) columnValues["text"] = contactPosition;

    const escapedColumns = JSON.stringify(JSON.stringify(columnValues));
    const escapedTitle = JSON.stringify(leadTitle);
    const createQuery = `mutation { create_item(board_id: ${LEADS_BOARD_ID}, group_id: "${groupId}", item_name: ${escapedTitle}, column_values: ${escapedColumns}) { id name } }`;

    const createRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: createQuery }),
    });
    const createData = await createRes.json();
    if (createData.errors) {
      console.error("Monday lead error:", createData.errors);
      return NextResponse.json({ error: createData.errors[0]?.message || "Create failed" }, { status: 500 });
    }

    const leadId = createData.data?.create_item?.id;
    return NextResponse.json({
      success: true,
      leadId,
      leadName: createData.data?.create_item?.name,
      leadUrl: `https://white-red.monday.com/boards/${LEADS_BOARD_ID}/pulses/${leadId}`,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
