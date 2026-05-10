import { NextRequest, NextResponse } from "next/server";
import { loadContactCache, getContactCache } from "@/lib/contacts-cache";

export const dynamic = "force-dynamic";

const CONTACTS_BOARD_ID = 1461714569;
const LEADS_BOARD_ID = 1461714586;

let userCache: { id: number; name: string }[] = [];
let userCacheTime = 0;
const USER_CACHE_TTL = 1000 * 60 * 60;

async function resolveDirectorUserId(director: string, apiKey: string): Promise<number | null> {
  if (Date.now() - userCacheTime > USER_CACHE_TTL || userCache.length === 0) {
    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: "query { users { id name } }" }),
    });
    const data = await res.json();
    userCache = (data.data?.users || []).map((u: { id: string; name: string }) => ({
      id: parseInt(u.id, 10),
      name: u.name.toLowerCase(),
    }));
    userCacheTime = Date.now();
  }
  const match = userCache.find(u => u.name.includes(director.toLowerCase()));
  return match?.id ?? null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const {
      accountId,
      accountName,
      name,
      position,
      email,
      phone,
      note,
      connectedToContactId,
      director,
      alsoCreateLead,
    } = await request.json();

    if (!name?.trim()) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    // Layer 2: check for existing contact with same name at same account
    if (accountId) {
      try {
        await loadContactCache(apiKey);
        const cache = getContactCache();
        const nameLower = name.trim().toLowerCase();
        const duplicate = cache.find(
          c => c.name.toLowerCase().trim() === nameLower && c.accountId === String(accountId)
        );
        if (duplicate) {
          return NextResponse.json({
            error: "duplicate",
            existingContactId: duplicate.id,
            existingContactName: duplicate.name,
            message: `A contact named "${duplicate.name}" already exists at ${accountName || "this account"}.`,
          }, { status: 409 });
        }
      } catch { /* cache unavailable — proceed with creation */ }
    }

    const columnValues: Record<string, unknown> = {};
    if (accountName) columnValues["text8"] = accountName;
    if (position) columnValues["text_mm25ab00"] = position;
    if (email) columnValues["contact_email"] = { email, text: email };
    if (phone) columnValues["contact_phone"] = { phone, countryShortName: "GB" };
    if (connectedToContactId) columnValues["board_relation_mm25s0kr"] = { item_ids: [parseInt(connectedToContactId, 10)] };
    if (accountId) columnValues["contact_account"] = { item_ids: [parseInt(accountId, 10)] };

    if (director) {
      const userId = await resolveDirectorUserId(director, apiKey);
      if (userId) columnValues["people__1"] = { personsAndTeams: [{ id: userId, kind: "person" }] };
    }

    const escapedColumns = JSON.stringify(JSON.stringify(columnValues));
    const escapedName = JSON.stringify(name.trim());
    const createQuery = `mutation { create_item(board_id: ${CONTACTS_BOARD_ID}, item_name: ${escapedName}, column_values: ${escapedColumns}) { id name } }`;

    const createRes = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: createQuery }),
    });
    const createData = await createRes.json();
    if (createData.errors) {
      console.error("Monday add-contact error:", createData.errors);
      return NextResponse.json({ error: createData.errors[0]?.message || "Create failed" }, { status: 500 });
    }

    const contactId = createData.data?.create_item?.id;

    if (note && contactId) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const prefix = `[${dd}/${mm}/${yyyy} ${hh}:${min}] (Norman): `;
      const noteValue = JSON.stringify(`${prefix}${note.trim()}`);
      const noteQuery = `mutation { change_simple_column_value(item_id: ${contactId}, board_id: ${CONTACTS_BOARD_ID}, column_id: "long_text4", value: ${noteValue}) { id } }`;
      await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: apiKey },
        body: JSON.stringify({ query: noteQuery }),
      });
    }

    let leadId: string | undefined;
    let leadUrl: string | undefined;
    if (alsoCreateLead && contactId) {
      const leadTitle = accountName ? `${name.trim()} - ${accountName}` : name.trim();
      const leadCols: Record<string, unknown> = {
        connect_boards5__1: { item_ids: [parseInt(contactId, 10)] },
      };
      if (email) leadCols["email"] = { email, text: email };
      if (phone) leadCols["phone"] = { phone, countryShortName: "GB" };
      if (position) leadCols["text"] = position;

      const escapedLeadCols = JSON.stringify(JSON.stringify(leadCols));
      const escapedLeadTitle = JSON.stringify(leadTitle);
      const leadQuery = `mutation { create_item(board_id: ${LEADS_BOARD_ID}, item_name: ${escapedLeadTitle}, column_values: ${escapedLeadCols}) { id name } }`;
      const leadRes = await fetch("https://api.monday.com/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: apiKey },
        body: JSON.stringify({ query: leadQuery }),
      });
      const leadData = await leadRes.json();
      leadId = leadData.data?.create_item?.id;
      if (leadId) leadUrl = `https://white-red.monday.com/boards/${LEADS_BOARD_ID}/pulses/${leadId}`;
    }

    return NextResponse.json({
      success: true,
      contactId,
      contactUrl: `https://white-red.monday.com/boards/${CONTACTS_BOARD_ID}/pulses/${contactId}`,
      leadId,
      leadUrl,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
