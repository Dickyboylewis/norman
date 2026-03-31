import { NextResponse } from "next/server";

/**
 * Monday.com Deals API Route
 *
 * Fetches all deals from the Monday.com Deals board (ID: 1461714574)
 * and returns per-person YTD revenue data for the DealRevenueChart.
 *
 * ── KEY LOGIC ─────────────────────────────────────────────────────────────
 *
 * 1. WON FILTER
 *    Only deals where the `deal_stage` column is exactly "Won" are included.
 *
 * 2. YTD FILTER
 *    Only deals whose Won Date (date_mkkzr5kz) falls between Jan 1st of the
 *    current calendar year and today are included. Deals from previous years
 *    are strictly excluded.
 *
 * 3. OWNER PARSING
 *    The deal_owner column value is a JSON string containing a personsAndTeams
 *    array. We JSON.parse() it and map person IDs to known director names.
 *
 * 4. REVENUE SPLIT
 *    If ownerCount is 1, the full deal_value goes to that person's "Individual" total.
 *    If ownerCount > 1, deal_value / ownerCount goes to each person's "Shared" total.
 *
 * 5. RESPONSE SHAPE
 *    Returns an array of deal objects per person, each with:
 *      {
 *        name: string,
 *        deals: Array<{ dealName, value, isShared, owners }>,
 *        total: number,
 *      }
 */

const DEALS_BOARD_ID = "1461714574";

/** Map Monday.com person IDs → director names */
const KNOWN_OWNER_IDS: Record<number, string> = {
  60328447: "Joe Haire",
  58965577: "Dicky Lewis",
  60328434: "Jesus Jimenez",
};

/** Fallback: map display names → canonical names (for safety) */
const KNOWN_OWNER_NAMES: Record<string, string> = {
  "Joe Haire":     "Joe Haire",
  "Jesus Jimenez": "Jesus Jimenez",
  "Dicky Lewis":   "Dicky Lewis",
};

export async function GET() {
  const apiKey = process.env.MONDAY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing Monday.com API key" }, { status: 500 });
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
            boards(ids: [${DEALS_BOARD_ID}]) {
              items_page(limit: 500) {
                cursor
                items {
                  name
                  column_values { id text type value }
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
                column_values { id text type value }
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

    console.log(`[Deals API] Total items fetched from Monday.com: ${allItems.length}`);

    // ── YTD window: Jan 1st of current year → today ────────────────────────
    const now = new Date();
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    ytdStart.setHours(0, 0, 0, 0);

    console.log(`[Deals API] YTD filter: ${ytdStart.toISOString()} → ${now.toISOString()}`);

    // ── Per-person deal accumulator ────────────────────────────────────────
    type DealEntry = {
      dealName: string;
      value: number;
      isShared: boolean;
      owners: string[];
    };

    const personDeals: Record<string, DealEntry[]> = {
      "Joe Haire":     [],
      "Jesus Jimenez": [],
      "Dicky Lewis":   [],
    };

    // ── Process every deal item ────────────────────────────────────────────
    allItems.forEach((item: any) => {
      const cols = item.column_values as Array<{
        id: string;
        text: string;
        type: string;
        value: string;
      }>;

      // ── STRICT "Won" filter on deal_stage ────────────────────────────────
      const stageCol = cols.find((c) => c.id === "deal_stage");
      const stageText = stageCol?.text?.trim() ?? "";

      if (stageText !== "Won") return; // Skip anything that isn't "Won"

      // ── Parse Won Date from date_mkkzr5kz (the specific Won Date column) ─
      const wonDateCol = cols.find((c) => c.id === "date_mkkzr5kz");
      const wonDateText = wonDateCol?.text?.trim() ?? "";

      let dealDate: Date | null = null;

      // Try parsing from the text field first (format: YYYY-MM-DD)
      if (wonDateText) {
        const parsed = new Date(wonDateText);
        if (!isNaN(parsed.getTime())) dealDate = parsed;
      }

      // Fallback: try parsing from the JSON value field
      if (!dealDate && wonDateCol?.value) {
        try {
          const parsed = JSON.parse(wonDateCol.value);
          if (parsed.date) {
            const d = new Date(parsed.date);
            if (!isNaN(d.getTime())) dealDate = d;
          }
        } catch {
          // ignore
        }
      }

      // Log every Won deal's date for debugging
      console.log(`[Deals API] Won deal "${item.name}" — date_mkkzr5kz: "${wonDateText}" — parsed: ${dealDate?.toISOString() ?? "null"}`);

      // ── STRICT YTD filter: must be >= Jan 1 of current year and <= today ──
      if (!dealDate || dealDate < ytdStart || dealDate > now) {
        console.log(`[Deals API]   → EXCLUDED (outside YTD range)`);
        return;
      }

      console.log(`[Deals API]   → INCLUDED in YTD`);

      // ── Parse deal value ─────────────────────────────────────────────────
      const valueCol = cols.find((c) => c.id === "deal_value");
      let dealValue = 0;

      if (valueCol?.value) {
        try {
          // deal_value comes as a JSON string like "30000" or {"number": 30000}
          const parsed = JSON.parse(valueCol.value);
          if (typeof parsed === "number") {
            dealValue = parsed;
          } else if (typeof parsed === "object" && typeof parsed.number === "number") {
            dealValue = parsed.number;
          }
        } catch {
          // Fall back to text parsing
        }
      }

      // Fallback: parse from text
      if (dealValue === 0 && valueCol?.text) {
        const cleaned = valueCol.text.replace(/[£$€,\s]/g, "");
        const num = parseFloat(cleaned);
        if (!isNaN(num)) dealValue = num;
      }

      if (dealValue <= 0) return;

      // ── Parse owners by JSON.parse()-ing the deal_owner value ────────────
      const ownerCol = cols.find((c) => c.id === "deal_owner");
      const owners: string[] = [];

      if (ownerCol?.value) {
        try {
          const parsed = JSON.parse(ownerCol.value);
          const personsAndTeams: Array<{ id: number; kind: string }> =
            parsed.personsAndTeams || [];

          personsAndTeams.forEach((p) => {
            const name = KNOWN_OWNER_IDS[p.id];
            if (name) {
              owners.push(name);
            }
          });
        } catch {
          // Fallback: try splitting the text field by comma
          const ownerText = ownerCol?.text ?? "";
          ownerText
            .split(/[,\n]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0 && KNOWN_OWNER_NAMES[s])
            .forEach((s: string) => owners.push(KNOWN_OWNER_NAMES[s]));
        }
      }

      if (owners.length === 0) return;

      const ownerCount = owners.length;

      // ── Split value equally between owners ────────────────────────────────
      const splitValue = dealValue / ownerCount;
      const isShared   = ownerCount > 1;

      console.log(`[Deals API]   → value: £${dealValue}, ownerCount: ${ownerCount}, splitValue: £${splitValue}, owners: [${owners.join(", ")}], shared: ${isShared}`);

      owners.forEach((owner) => {
        if (personDeals[owner]) {
          personDeals[owner].push({
            dealName: item.name || "Unnamed Deal",
            value:    splitValue,
            isShared,
            owners,
          });
        }
      });
    });

    // ── Build response array ───────────────────────────────────────────────
    const result = Object.entries(personDeals).map(([name, deals]) => ({
      name,
      deals,
      total: deals.reduce((sum, d) => sum + d.value, 0),
    }));

    // ── Debug: log final totals ────────────────────────────────────────────
    console.log(`[Deals API] ═══ FINAL YTD TOTALS ═══`);
    result.forEach((person) => {
      console.log(`[Deals API]   ${person.name}: £${person.total.toFixed(2)} (${person.deals.length} deals)`);
    });
    console.log(`[Deals API] ═══════════════════════`);

    return NextResponse.json(result);

  } catch (error) {
    console.error("Monday Deals API Error:", error);
    return NextResponse.json({ error: "Failed to fetch deals data" }, { status: 500 });
  }
}
