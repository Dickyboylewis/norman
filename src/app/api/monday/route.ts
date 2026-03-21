import { NextResponse } from "next/server";

export async function GET() {
  const boardId = process.env.MONDAY_BOARD_ID;
  const apiKey = process.env.MONDAY_API_KEY;

  if (!boardId || !apiKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
  }

  try {
    let allItems: any[] = [];
    let currentCursor = null;
    let hasMore = true;
    let fetchCount = 0;

    // Loop through Monday's pages to get all leads
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
          "API-Version": "2024-01"
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      
      let itemsBatch = [];
      if (!currentCursor) {
         itemsBatch = data.data?.boards[0]?.items_page?.items || [];
         currentCursor = data.data?.boards[0]?.items_page?.cursor;
      } else {
         itemsBatch = data.data?.next_items_page?.items || [];
         currentCursor = data.data?.next_items_page?.cursor;
      }

      allItems = allItems.concat(itemsBatch);
      
      if (!currentCursor) {
        hasMore = false;
      }
      fetchCount++;
    }

    // Our exact scoreboard categories
    const scoreboard: Record<string, any> = {
      "Joe Haire": { name: "Joe Haire", "New Lead": 0, "Attempted to Contact": 0, "Needs Follow up": 0, "Appointments": 0 },
      "Jesus Jimenez": { name: "Jesus Jimenez", "New Lead": 0, "Attempted to Contact": 0, "Needs Follow up": 0, "Appointments": 0 },
      "Dicky Lewis": { name: "Dicky Lewis", "New Lead": 0, "Attempted to Contact": 0, "Needs Follow up": 0, "Appointments": 0 },
    };

    // Calculate "This Week" (Starts Monday at Midnight)
    const now = new Date();
    const dayOfWeek = now.getDay(); 
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // Crunch ALL the leads strictly by Created or Moved Date
    allItems.forEach((item: any) => {
      
      // Grab exact columns based on the X-Ray data
      const ownerCol = item.column_values.find((c: any) => c.id === "lead_owner");
      const statusCol = item.column_values.find((c: any) => c.id === "lead_status");
      
      const createdDateCol = item.column_values.find((c: any) => c.id === "date__1");
      const moveDateCol = item.column_values.find((c: any) => c.id === "date0__1");
      
      const owner = ownerCol?.text;
      const status = statusCol?.text || "";
      
      let isThisWeek = false;

      // STRICT CHECK: Only count if Created Date OR Status Move Date is >= Monday of this week
      if (createdDateCol?.text && new Date(createdDateCol.text) >= startOfWeek) {
          isThisWeek = true;
      }
      if (moveDateCol?.text && new Date(moveDateCol.text) >= startOfWeek) {
          isThisWeek = true;
      }

      // If it genuinely moved/was created this week, score it!
      if (owner && scoreboard[owner] && isThisWeek) {
        const statusClean = status.toLowerCase().trim();

        if (statusClean.includes("new lead") || statusClean.includes("1 -")) {
            scoreboard[owner]["New Lead"] += 1;
        } else if (statusClean.includes("attempted") || statusClean.includes("2 -")) {
            scoreboard[owner]["Attempted to Contact"] += 1;
        } else if (statusClean.includes("follow") || statusClean.includes("contact") || statusClean.includes("3 -")) {
            scoreboard[owner]["Needs Follow up"] += 1;
        } else if (statusClean.includes("appointment") || statusClean.includes("qualified") || statusClean.includes("4 -")) {
            scoreboard[owner]["Appointments"] += 1;
        }
      }
    });

    const chartData = Object.values(scoreboard);
    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Monday API Error:", error);
    return NextResponse.json({ error: "Failed to parse data" }, { status: 500 });
  }
}