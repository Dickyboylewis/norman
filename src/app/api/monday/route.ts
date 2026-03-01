/**
 * Monday.com API Route
 *
 * This server-side route fetches leads/CRM data from Monday.com boards.
 * Your API key NEVER leaves the server.
 *
 * REQUIRED ENVIRONMENT VARIABLES (add to .env.local):
 *   MONDAY_API_KEY    - Your Monday.com API token
 *                       Get it from: Monday.com > Profile > Developers > My Access Tokens
 *   MONDAY_BOARD_ID   - The numeric ID of your leads board
 *                       Get it from the board URL: monday.com/boards/{BOARD_ID}
 *
 * Monday.com API Docs: https://developer.monday.com/api-reference/docs
 * The API uses GraphQL — see the query below for the shape of data we fetch.
 *
 * TODO: Replace the mock data below with real Monday.com API calls.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | "New Lead"
  | "Contacted"
  | "Proposal Sent"
  | "Negotiating"
  | "Won"
  | "Lost";

export interface Lead {
  id: string;
  name: string;
  status: LeadStatus;
  value: number;
  assignee: string;
  lastActivity: string;
}

export interface MondayData {
  boardName: string;
  totalLeads: number;
  activeLeads: number;
  totalPipelineValue: number;
  currency: string;
  leads: Lead[];
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
    const boardId = process.env.MONDAY_BOARD_ID;
    const apiKey = process.env.MONDAY_API_KEY;

    if (!boardId || !apiKey) {
      return NextResponse.json(
        { error: "Missing Monday.com credentials in environment" },
        { status: 500 }
      );
    }

    // ─── Fetch board structure to find column IDs ───────────────────────────
    const structureQuery = `
      query {
        boards(ids: [${boardId}]) {
          name
          columns {
            id
            title
            type
          }
        }
      }
    `;

    const structureResponse = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query: structureQuery }),
    });

    const structureData = await structureResponse.json();
    if (structureData.errors) {
      throw new Error(
        `Monday.com API error: ${structureData.errors[0]?.message}`
      );
    }

    const board = structureData.data?.boards[0];
    if (!board) {
      throw new Error("Board not found");
    }

    // ─── Fetch items (leads) with all column values ───────────────────────
    const itemsQuery = `
      query {
        boards(ids: [${boardId}]) {
          name
          items_page(limit: 50) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
              created_at
            }
          }
        }
      }
    `;

    const itemsResponse = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({ query: itemsQuery }),
    });

    const itemsData = await itemsResponse.json();
    if (itemsData.errors) {
      throw new Error(
        `Monday.com API error: ${itemsData.errors[0]?.message}`
      );
    }

    const boardData = itemsData.data?.boards[0];
    if (!boardData) {
      throw new Error("No board data found");
    }

    // ─── Transform Monday.com items into Lead objects ────────────────────
    const leads: Lead[] = (boardData.items_page?.items || []).map(
      (item: any) => {
        // Extract column values by looking at text/value fields
        const statusColumn = item.column_values.find(
          (col: any) =>
            col.text &&
            [
              "New Lead",
              "Contacted",
              "Proposal Sent",
              "Negotiating",
              "Won",
              "Lost",
            ].includes(col.text)
        );

        const valueColumn = item.column_values.find(
          (col: any) => col.id?.includes("budget") || col.id?.includes("value")
        );

        const assigneeColumn = item.column_values.find(
          (col: any) => col.id?.includes("assignee") || col.id?.includes("person")
        );

        return {
          id: item.id,
          name: item.name,
          status: (statusColumn?.text as LeadStatus) || "New Lead",
          value: valueColumn ? parseInt(valueColumn.value) || 0 : 0,
          assignee: assigneeColumn?.text || "Unassigned",
          lastActivity: new Date(item.created_at).toISOString().split("T")[0],
        };
      }
    );

    // ─── Calculate summary stats ──────────────────────────────────────────
    const activeStatuses: LeadStatus[] = [
      "Contacted",
      "Proposal Sent",
      "Negotiating",
    ];
    const activeLeads = leads.filter((l) => activeStatuses.includes(l.status))
      .length;
    const totalPipelineValue = leads.reduce((sum, l) => sum + l.value, 0);

    const response: MondayData = {
      boardName: boardData.name,
      totalLeads: leads.length,
      activeLeads,
      totalPipelineValue,
      currency: "GBP",
      leads: leads.slice(0, 20), // Show top 20 leads
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Monday.com API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch Monday.com data" },
      { status: 500 }
    );
  }
}
