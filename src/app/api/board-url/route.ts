import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BOARD_IDS: Record<string, string> = {
  contacts: "1461714569",
};

export async function GET(request: Request) {
  const apiKey = process.env.MONDAY_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const board = searchParams.get("board");
  const boardId = board ? BOARD_IDS[board] : undefined;

  if (!boardId) {
    return NextResponse.json({ error: "Unknown board" }, { status: 400 });
  }

  try {
    const query = `
      query {
        boards(ids: [${boardId}]) {
          url
        }
      }
    `;

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
    const url = data.data?.boards?.[0]?.url;

    if (!url) {
      return NextResponse.json({ error: "Board not found" }, { status: 502 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Monday API Error:", error);
    return NextResponse.json({ error: "Failed to fetch board url" }, { status: 500 });
  }
}
