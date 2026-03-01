/**
 * Notion API Route
 *
 * This server-side route fetches notes/action items from a Notion database.
 * Your API key NEVER leaves the server.
 *
 * REQUIRED ENVIRONMENT VARIABLES (add to .env.local):
 *   NOTION_API_KEY       - Your Notion Internal Integration Token
 *                          Get it from: https://www.notion.so/my-integrations
 *   NOTION_DATABASE_ID   - The ID of your Notion database
 *                          Get it from the database URL:
 *                          notion.so/{workspace}/{DATABASE_ID}?v=...
 *                          (the 32-char hex string before the "?")
 *
 * Notion Integration Setup:
 *   1. Go to https://www.notion.so/my-integrations and create a new integration
 *   2. Copy the "Internal Integration Token" → NOTION_API_KEY
 *   3. Open your Notion database, click "..." > "Add connections" > select your integration
 *   4. Copy the database ID from the URL → NOTION_DATABASE_ID
 *
 * Notion API Docs: https://developers.notion.com/reference/intro
 *
 * TODO: Replace the mock data below with real Notion API calls.
 * Recommended library: @notionhq/client (official Notion SDK)
 *   npm install @notionhq/client
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NoteType = "Action Item" | "Note" | "Decision" | "Meeting";
export type NotePriority = "High" | "Medium" | "Low";

export interface NotionNote {
  id: string;
  title: string;
  type: NoteType;
  priority: NotePriority;
  tags: string[];
  lastEdited: string;
  url: string;
  completed: boolean;
}

export interface NotionData {
  databaseName: string;
  totalItems: number;
  actionItems: number;
  notes: NotionNote[];
  lastUpdated: string;
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function GET() {
  // Protect this route — only authenticated users can call it
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ─── TODO: Replace with real Notion API call ───────────────────────────
    //
    // Using the official @notionhq/client SDK:
    //
    // import { Client } from "@notionhq/client";
    //
    // const notion = new Client({ auth: process.env.NOTION_API_KEY });
    //
    // const response = await notion.databases.query({
    //   database_id: process.env.NOTION_DATABASE_ID!,
    //   sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    //   page_size: 10,
    //   // Optional: filter to only show incomplete action items
    //   // filter: {
    //   //   property: "Status",
    //   //   checkbox: { equals: false },
    //   // },
    // });
    //
    // // Transform response.results into your NotionNote[] shape
    // // Each page has properties like: response.results[0].properties.Name.title[0].plain_text
    // ─── End TODO ─────────────────────────────────────────────────────────────

    // Mock data — remove this block once you connect the real API
    const mockData: NotionData = {
      databaseName: "Team Notes & Actions",
      totalItems: 47,
      actionItems: 12,
      notes: [
        {
          id: "1",
          title: "Follow up with Globex on revised proposal",
          type: "Action Item",
          priority: "High",
          tags: ["Sales", "Urgent"],
          lastEdited: "2025-06-02T14:30:00Z",
          url: "https://notion.so/your-page-id",
          completed: false,
        },
        {
          id: "2",
          title: "Q2 Marketing Strategy Review",
          type: "Meeting",
          priority: "Medium",
          tags: ["Marketing", "Strategy"],
          lastEdited: "2025-06-01T10:00:00Z",
          url: "https://notion.so/your-page-id",
          completed: false,
        },
        {
          id: "3",
          title: "Update onboarding documentation",
          type: "Action Item",
          priority: "Low",
          tags: ["Ops", "Documentation"],
          lastEdited: "2025-05-31T16:45:00Z",
          url: "https://notion.so/your-page-id",
          completed: false,
        },
        {
          id: "4",
          title: "Decision: Move to annual billing for SaaS tools",
          type: "Decision",
          priority: "Medium",
          tags: ["Finance", "Ops"],
          lastEdited: "2025-05-30T09:15:00Z",
          url: "https://notion.so/your-page-id",
          completed: true,
        },
        {
          id: "5",
          title: "Research competitor pricing models",
          type: "Note",
          priority: "Low",
          tags: ["Research", "Strategy"],
          lastEdited: "2025-05-29T11:20:00Z",
          url: "https://notion.so/your-page-id",
          completed: false,
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error("[Notion API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch Notion data" },
      { status: 500 }
    );
  }
}
