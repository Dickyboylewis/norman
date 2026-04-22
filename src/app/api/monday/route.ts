import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Monday.com Prospecting API Route
 *
 * Fetches all leads from the Monday.com board and aggregates them into a
 * per-person scoreboard for the current week (Mon 00:00 → now).
 *
 * KEY LOGIC — Joint Appointments:
 *   The "lead_owner" column is a Monday.com "People" type column that can
 *   hold multiple people (e.g. "Joe Haire, Dicky Lewis").
 *   When a lead is an appointment AND has multiple owners, EVERY owner gets
 *   credit for that appointment — matching the Monday.com leaderboard behaviour.
 *
 * KEY LOGIC — Status Counting:
 *   Each lead is counted once, under the HIGHEST status it has reached.
 *   The status categories map to the four chart segments:
 *     1. New Lead
 *     2. Attempted to Contact
 *     3. Needs Follow up
 *     4. Appointments  ← the green segment; only this is shown above the bar
 */

export async function GET() {
  const boardId = process.env.MONDAY_BOARD_ID;
  const apiKey  = process.env.MONDAY_API_KEY;

  if (!boardId || !apiKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
  }

  try {
    let allItems: any[] = [];
    let currentCursor: string | null = null;
    let hasMore = true;
    let fetchCount = 0;

    // ── Paginate through all Monday.com items ──────────────────────────────
    while (hasMore && fetchCount < 10) {
      let query = "";

      if (!currentCursor) {
        query = `
          query {
            boards(ids: [${boardId}]) {
              items_page(limit: 500) {
                cursor
                items {
                  name
                  column_values { id text type }
                }
              }
            }
          }
        `;
      } else {
        query = `
          query {
            next_items_page(limit: 500, cursor: "${currentCursor}") {
              cursor
              items {
                name
                column_values { id text type }
              }
            }
          }
        `;
      }

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

      let itemsBatch: any[] = [];
      if (!currentCursor) {
        itemsBatch    = data.data?.boards[0]?.items_page?.items || [];
        currentCursor = data.data?.boards[0]?.items_page?.cursor ?? null;
      } else {
        itemsBatch    = data.data?.next_items_page?.items || [];
        currentCursor = data.data?.next_items_page?.cursor ?? null;
      }

      allItems = allItems.concat(itemsBatch);

      if (!currentCursor) hasMore = false;
      fetchCount++;
    }

    // ── Scoreboard skeleton ────────────────────────────────────────────────
    // Keys are the EXACT full names as they appear in Monday.com.
    type ScoreEntry = {
      name: string;
      "New Lead": number;
      "Attempted to Contact": number;
      "Needs Follow up": number;
      "Appointments": number;
      [key: string]: string | number;
    };
    const scoreboard: Record<string, ScoreEntry> = {
      "Joe Haire":     { name: "Joe Haire",     "New Lead": 0, "Attempted to Contact": 0, "Needs Follow up": 0, "Appointments": 0 },
      "Jesus Jimenez": { name: "Jesus Jimenez", "New Lead": 0, "Attempted to Contact": 0, "Needs Follow up": 0, "Appointments": 0 },
      "Dicky Lewis":   { name: "Dicky Lewis",   "New Lead": 0, "Attempted to Contact": 0, "Needs Follow up": 0, "Appointments": 0 },
    };

    // ── "This Week" window: Monday 00:00 → now ─────────────────────────────
    const now = new Date();
    const dayOfWeek      = now.getDay(); // 0 = Sun
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek    = new Date(now);
    startOfWeek.setDate(now.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // ── Process every lead ─────────────────────────────────────────────────
    allItems.forEach((item: any) => {
      const ownerCol       = item.column_values.find((c: any) => c.id === "lead_owner");
      const statusCol      = item.column_values.find((c: any) => c.id === "lead_status");
      const createdDateCol = item.column_values.find((c: any) => c.id === "date__1");
      const moveDateCol    = item.column_values.find((c: any) => c.id === "date0__1");

      const ownerText = ownerCol?.text ?? "";
      const status    = statusCol?.text ?? "";

      // ── Date filter: must have been created OR moved this week ───────────
      let isThisWeek = false;
      if (createdDateCol?.text && new Date(createdDateCol.text) >= startOfWeek) isThisWeek = true;
      if (moveDateCol?.text    && new Date(moveDateCol.text)    >= startOfWeek) isThisWeek = true;

      if (!isThisWeek) return;

      // ── Resolve owners — supports multiple people in one column ──────────
      // Monday.com "People" columns return comma-separated full names,
      // e.g. "Joe Haire, Dicky Lewis" for a joint appointment.
      // We split on commas AND newlines to be safe, then trim each name.
      const owners: string[] = ownerText
        .split(/[,\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && scoreboard[s]);

      if (owners.length === 0) return;

      // ── Classify the status ──────────────────────────────────────────────
      const statusClean = status.toLowerCase().trim();

      let category: keyof typeof scoreboard[string] | null = null;

      if (statusClean.includes("appointment") || statusClean.includes("qualified") || statusClean.includes("4 -")) {
        category = "Appointments";
      } else if (statusClean.includes("attempted") || statusClean.includes("2 -")) {
        category = "Attempted to Contact";
      } else if (statusClean.includes("follow") || statusClean.includes("needs") || statusClean.includes("3 -")) {
        category = "Needs Follow up";
      } else if (statusClean.includes("new lead") || statusClean.includes("1 -")) {
        category = "New Lead";
      }

      if (!category) return;

      // ── Credit EVERY owner (joint appointment support) ───────────────────
      // If two people share an appointment, both get +1 Appointments.
      owners.forEach((owner) => {
        (scoreboard[owner][category as string] as number) += 1;
      });
    });

    const chartData = Object.values(scoreboard);
    return NextResponse.json(chartData);

  } catch (error) {
    console.error("Monday API Error:", error);
    return NextResponse.json({ error: "Failed to parse data" }, { status: 500 });
  }
}
