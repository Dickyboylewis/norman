import { NextRequest, NextResponse } from "next/server";
import { ensureLogoColumns } from "@/lib/monday-columns";
import { CRE_DOMAIN_MAP } from "@/app/api/crm/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ACCOUNTS_BOARD_ID = 1461714573;

interface MondayItem {
  id: string;
  name: string;
  column_values: Array<{ id: string; text: string; value: string }>;
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(ltd|limited|llp|inc|plc|group|holdings|international|uk|gb|advisors|advisers|partners|llc)\b/g, "")
    .trim().replace(/\s+/g, " ");
}

function guessDomain(name: string): string {
  const norm = normalizeForMatch(name);
  if (!norm) return "";

  // 1. Exact full-string match
  for (const [key, domain] of Object.entries(CRE_DOMAIN_MAP)) {
    if (normalizeForMatch(key) === norm) return domain;
  }

  // 2. Word-boundary: all key words appear as separate words in account name
  const words = norm.split(" ");
  for (const [key, domain] of Object.entries(CRE_DOMAIN_MAP)) {
    const keyWords = normalizeForMatch(key).split(" ").filter(Boolean);
    if (keyWords.length > 0 && keyWords.every(kw => words.includes(kw))) return domain;
  }

  // 3. Account name starts with the key (e.g. "CBRE Investment Management" -> cbre.com)
  for (const [key, domain] of Object.entries(CRE_DOMAIN_MAP)) {
    const keyNorm = normalizeForMatch(key);
    if (norm.startsWith(keyNorm + " ") || norm === keyNorm) return domain;
  }

  // 4. Fall back: best-guess slug (first word + full slug, .co.uk tried at call site)
  const slug = norm.replace(/\s+/g, "").slice(0, 20);
  return slug.length > 4 ? `${slug}.com` : "";
}

async function tryFetchLogoUrl(domain: string): Promise<string | null> {
  if (!domain) return null;
  const sources = [
    // Direct apple-touch-icon — high quality (180x180), works for most major sites
    `https://${domain}/apple-touch-icon.png`,
    // DuckDuckGo favicon proxy — reliable, no auth required
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    // Google favicon — fallback; returns placeholder for unknown domains
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 Norman-Logo-Fetcher", "Accept": "image/*" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.startsWith("image/")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      // 200 bytes minimum: Google's transparent placeholder is ~67–80b, real icons are larger
      if (buffer.length < 200) continue;
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

async function updateAccountLogo(
  apiKey: string,
  itemId: string,
  logoUrl: string,
  source: string,
  columnIds: { logoUrlColId: string; logoSourceColId: string },
) {
  const colVals: Record<string, string> = {
    [columnIds.logoUrlColId]: logoUrl,
    [columnIds.logoSourceColId]: source,
  };
  const escapedColVals = JSON.stringify(JSON.stringify(colVals));
  const query = `mutation { change_multiple_column_values (item_id: ${itemId}, board_id: ${ACCOUNTS_BOARD_ID}, column_values: ${escapedColVals}) { id } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100", 10);
  const force = request.nextUrl.searchParams.get("force") === "true";
  const skipFailed = request.nextUrl.searchParams.get("skipFailed") === "true";
  const namesParam = request.nextUrl.searchParams.get("names");
  const nameFilter = namesParam ? new Set(namesParam.split(",").map(n => n.trim())) : null;

  console.log("[bulk-fetch-logos] CRE_DOMAIN_MAP loaded with", Object.keys(CRE_DOMAIN_MAP).length, "entries");

  const columnIds = await ensureLogoColumns(apiKey);

  const allItems: MondayItem[] = [];
  let cursor: string | null = null;
  let fetches = 0;
  while (fetches < 20) {
    const query: string = !cursor
      ? `query { boards(ids: [${ACCOUNTS_BOARD_ID}]) { items_page(limit: 500) { cursor items { id name column_values(ids: ["${columnIds.logoUrlColId}", "${columnIds.logoSourceColId}", "company_domain"]) { id text value } } } } }`
      : `query { next_items_page(limit: 500, cursor: "${cursor}") { cursor items { id name column_values(ids: ["${columnIds.logoUrlColId}", "${columnIds.logoSourceColId}", "company_domain"]) { id text value } } } }`;
    const res: Response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const page: { cursor?: string | null; items?: MondayItem[] } | undefined = !cursor ? data.data?.boards?.[0]?.items_page : data.data?.next_items_page;
    allItems.push(...(page?.items || []));
    cursor = page?.cursor ?? null;
    if (!cursor) break;
    fetches++;
  }

  console.log(`[bulk-fetch-logos] Loaded ${allItems.length} accounts. Starting processing...`);

  let processed = 0;
  let skippedManual = 0;
  let skippedAlreadyAuto = 0;
  let skippedAlreadyFailed = 0;
  let succeeded = 0;
  let failed = 0;
  const failedNames: string[] = [];

  for (const item of allItems) {
    if (!nameFilter && processed >= limit) break;
    if (nameFilter && !nameFilter.has(item.name)) continue;

    const sourceCol = item.column_values.find(c => c.id === columnIds.logoSourceColId);
    const urlCol = item.column_values.find(c => c.id === columnIds.logoUrlColId);
    const domainCol = item.column_values.find(c => c.id === "company_domain");
    const currentSource = (sourceCol?.text || "").toLowerCase();
    const currentUrl = urlCol?.text || "";

    if (currentSource === "manual") { skippedManual++; continue; }
    if (skipFailed && currentSource === "auto-failed") { skippedAlreadyFailed++; continue; }
    if (!force && currentSource === "auto" && currentUrl) { skippedAlreadyAuto++; continue; }

    processed++;

    let domain = (domainCol?.text || "").trim();
    if (domain.includes(" - ")) domain = domain.split(" - ")[0].trim();
    domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (!domain) domain = guessDomain(item.name);

    // Build candidate list: primary domain + first-word variants (.com and .co.uk)
    const candidates: string[] = [];
    if (domain) candidates.push(domain);
    const firstWord = item.name.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
    if (firstWord.length > 3 && !candidates.some(c => c.startsWith(firstWord + "."))) {
      candidates.push(`${firstWord}.com`);
      candidates.push(`${firstWord}.co.uk`);
    }

    let logoUrl: string | null = null;
    for (const candidate of candidates) {
      logoUrl = await tryFetchLogoUrl(candidate);
      if (logoUrl) break;
    }

    if (logoUrl) {
      try {
        await updateAccountLogo(apiKey, item.id, logoUrl, "auto", columnIds);
        succeeded++;
        console.log(`[bulk-fetch-logos] OK ${item.name} -> ${logoUrl}`);
      } catch (e) {
        failed++;
        failedNames.push(item.name);
        console.log(`[bulk-fetch-logos] update-failed ${item.name}:`, e);
      }
    } else {
      try {
        await updateAccountLogo(apiKey, item.id, "", "auto-failed", columnIds);
      } catch { /* best-effort */ }
      failed++;
      failedNames.push(item.name);
      console.log(`[bulk-fetch-logos] no-logo ${item.name} (tried: ${candidates.join(", ") || "-"})`);
    }

    await new Promise(r => setTimeout(r, 150));
  }

  const summary = {
    totalAccounts: allItems.length,
    processed,
    succeeded,
    failed,
    skippedManual,
    skippedAlreadyAuto,
    skippedAlreadyFailed,
    failedSamples: failedNames.slice(0, 30),
    nextSteps: !nameFilter && processed >= limit
      ? "Re-visit /api/crm/bulk-fetch-logos to continue (skips already-processed)."
      : "All eligible accounts processed. Re-run with ?force=true to overwrite all auto entries.",
  };

  console.log("[bulk-fetch-logos] DONE:", summary);
  return NextResponse.json(summary);
}
