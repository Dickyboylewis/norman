import { NextResponse } from "next/server";

/**
 * Monday.com Deals API Route
 *
 * Fetches all deals from the Monday.com Deals board (ID: 1461714574)
 * and returns per-person YTD revenue data for the DealRevenueChart.
 *
 * ── KEY LOGIC ─────────────────────────────────────────────────────────────
 *
 * 1. YTD FILTER
 *    Only deals whose won/completion date falls between Jan 1st of the
 *    current calendar year and today are included.
 *
 * 2. REVENUE SPLIT
 *    If deal_owner contains multiple people (e.g. "Jesus Jimenez, Dicky Lewis"),
 *    the deal_value is split equally between them to avoid double-counting.
 *
 * 3. RESPONSE SHAPE
 *    Returns an array of deal objects per person, each with:
 *      {
 *        name: string,           // full name (e.g. "Joe Haire")
 *        deals: Array<{
 *          dealName: string,
 *          value: number,        // split value for this person
 *          isShared: boolean,    // true if multiple owners
 *          owners: string[],     // all owners of this deal
 *        }>
 *      }
 */

const DEALS_BOARD_ID = "1461714574";

// Known team members — used to filter/validate owners
const KNOWN_OWNERS: Record<string, string> = {
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

    // ── YTD window: Jan 1st of current year → today ────────────────────────
    const now = new Date();
    const ytdStart = new Date(now.getFullYear(), 0, 1); // Jan 1st 00:00:00
    ytdStart.setHours(0, 0, 0, 0);

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
      const cols = item.column_values as Array<{ id: string; text: string; type: string; value: string }>;

      // Find relevant columns
      const ownerCol     = cols.find((c) => c.id === "deal_owner");
      const valueCol     = cols.find((c) => c.id === "deal_value");
      // Try multiple possible date column IDs for won/completion date
      const wonDateCol   =
        cols.find((c) => c.id === "date__1") ||
        cols.find((c) => c.id === "date4") ||
        cols.find((c) => c.id === "date0") ||
        cols.find((c) => c.id === "date") ||
        cols.find((c) => c.type === "date" && c.text);

      // ── Parse deal value ─────────────────────────────────────────────────
      // deal_value may be a plain number, a currency string like "£150,000",
      // or a JSON value like {"number": 150000}
      let dealValue = 0;
      if (valueCol) {
        // Try JSON value first
        try {
          const parsed = JSON.parse(valueCol.value || "{}");
          if (typeof parsed.number === "number") {
            dealValue = parsed.number;
          } else if (typeof parsed === "number") {
            dealValue = parsed;
          }
        } catch {
          // Fall back to text parsing
        }

        if (dealValue === 0 && valueCol.text) {
          // Strip currency symbols, commas, spaces
          const cleaned = valueCol.text.replace(/[£$€,\s]/g, "");
          const num = parseFloat(cleaned);
          if (!isNaN(num)) dealValue = num;
        }
      }

      if (dealValue <= 0) return; // Skip deals with no value

      // ── Parse won/completion date ─────────────────────────────────────────
      let dealDate: Date | null = null;
      if (wonDateCol?.text) {
        const parsed = new Date(wonDateCol.text);
        if (!isNaN(parsed.getTime())) dealDate = parsed;
      }
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

      // ── YTD filter ────────────────────────────────────────────────────────
      if (!dealDate || dealDate < ytdStart || dealDate > now) return;

      // ── Resolve owners ────────────────────────────────────────────────────
      const ownerText = ownerCol?.text ?? "";
      const owners: string[] = ownerText
        .split(/[,\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && KNOWN_OWNERS[s]);

      if (owners.length === 0) return;

      // ── Split value equally between owners ────────────────────────────────
      const splitValue = dealValue / owners.length;
      const isShared   = owners.length > 1;

      owners.forEach((owner) => {
        personDeals[owner].push({
          dealName: item.name || "Unnamed Deal",
          value:    splitValue,
          isShared,
          owners,
        });
      });
    });

    // ── Build response array ───────────────────────────────────────────────
    const result = Object.entries(personDeals).map(([name, deals]) => ({
      name,
      deals,
      total: deals.reduce((sum, d) => sum + d.value, 0),
    }));

    return NextResponse.json(result);

  } catch (error) {
    console.error("Monday Deals API Error:", error);
    return NextResponse.json({ error: "Failed to fetch deals data" }, { status: 500 });
  }
}
