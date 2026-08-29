import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { validateOfficeLayout, type OfficeLayout } from "@/lib/office-layout";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const LAYOUT_FILE = path.join(DATA_DIR, "office-layout.json");
const LOOKUP_DELAY_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface SlackLookupResponse {
  ok: boolean;
  error?: string;
  user?: { id: string };
}

async function lookupByEmail(token: string, email: string): Promise<SlackLookupResponse> {
  const res = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "3", 10);
    await sleep(Math.min(retryAfter, 10) * 1000);
    const retry = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return retry.json();
  }
  return res.json();
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({
      configured: false,
      message: "SLACK_BOT_TOKEN is not set — add it to .env.local to sync Slack IDs",
    });
  }

  let layout: OfficeLayout;
  try {
    const parsed = JSON.parse(fs.readFileSync(LAYOUT_FILE, "utf8"));
    if (!validateOfficeLayout(parsed)) throw new Error("layout failed validation");
    layout = parsed;
  } catch (error) {
    console.error("slack-ids: could not read office layout:", error);
    return NextResponse.json({ error: "Could not read office layout" }, { status: 500 });
  }

  const found: { personId: string; email: string; slackId: string }[] = [];
  const notFound: { personId: string; email: string; error: string }[] = [];
  const skipped: { personId: string; reason: string }[] = [];

  for (const person of layout.people) {
    if (person.slackId) {
      skipped.push({ personId: person.id, reason: "already has slackId" });
      continue;
    }
    if (!person.email) {
      skipped.push({ personId: person.id, reason: "no email" });
      continue;
    }
    try {
      const result = await lookupByEmail(token, person.email);
      if (result.ok && result.user?.id) {
        person.slackId = result.user.id;
        found.push({ personId: person.id, email: person.email, slackId: result.user.id });
      } else {
        notFound.push({
          personId: person.id,
          email: person.email,
          error: result.error ?? "unknown error",
        });
      }
    } catch (error) {
      notFound.push({
        personId: person.id,
        email: person.email,
        error: error instanceof Error ? error.message : "request failed",
      });
    }
    await sleep(LOOKUP_DELAY_MS);
  }

  if (found.length > 0) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${LAYOUT_FILE}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, JSON.stringify(layout, null, 2) + "\n", "utf8");
      fs.renameSync(tmp, LAYOUT_FILE);
    } catch (error) {
      console.error("slack-ids: failed to save layout:", error);
      return NextResponse.json({ error: "Failed to save Slack IDs" }, { status: 500 });
    }
  }

  return NextResponse.json({ configured: true, found, notFound, skipped });
}
