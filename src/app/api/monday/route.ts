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
    // ─── TODO: Replace with real Monday.com GraphQL API call ──────────────
    //
    // const boardId = process.env.MONDAY_BOARD_ID;
    //
    // const query = `
    //   query {
    //     boards(ids: [${boardId}]) {
    //       name
    //       items_page(limit: 50) {
    //         items {
    //           id
    //           name
    //           column_values {
    //             id
    //             text
    //             value
    //           }
    //         }
    //       }
    //     }
    //   }
    // `;
    //
    // const response = await fetch("https://api.monday.com/v2", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: process.env.MONDAY_API_KEY!,
    //     "API-Version": "2024-01",
    //   },
    //   body: JSON.stringify({ query }),
    // });
    //
    // const { data } = await response.json();
    // // Transform data.boards[0].items_page.items into your Lead[] shape
    // ─── End TODO ─────────────────────────────────────────────────────────────

    // Mock data — remove this block once you connect the real API
    const mockData: MondayData = {
      boardName: "Sales Pipeline",
      totalLeads: 24,
      activeLeads: 18,
      totalPipelineValue: 385000,
      currency: "GBP",
      leads: [
        {
          id: "1",
          name: "Acme Corp",
          status: "Proposal Sent",
          value: 45000,
          assignee: "Sarah J.",
          lastActivity: "2025-06-02",
        },
        {
          id: "2",
          name: "Globex Industries",
          status: "Negotiating",
          value: 82000,
          assignee: "Mike T.",
          lastActivity: "2025-06-01",
        },
        {
          id: "3",
          name: "Initech Solutions",
          status: "Contacted",
          value: 28000,
          assignee: "Sarah J.",
          lastActivity: "2025-05-30",
        },
        {
          id: "4",
          name: "Umbrella Ltd",
          status: "New Lead",
          value: 15000,
          assignee: "Chris P.",
          lastActivity: "2025-05-29",
        },
        {
          id: "5",
          name: "Stark Enterprises",
          status: "Won",
          value: 120000,
          assignee: "Mike T.",
          lastActivity: "2025-05-28",
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(mockData);
  } catch (error) {
    console.error("[Monday.com API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch Monday.com data" },
      { status: 500 }
    );
  }
}
