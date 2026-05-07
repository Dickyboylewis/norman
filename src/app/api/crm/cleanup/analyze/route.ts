import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACCOUNTS_BOARD_ID = 1461714573;
const CONTACTS_BOARD_ID = 1461714569;

const KNOWN_WORDS = new Set([
  "the","of","and","group","partners","partner","real","estate","capital","properties","property",
  "holdings","investments","investment","asset","management","services","consulting","architects",
  "architect","builders","construction","engineers","engineering","advisory","advisors","developers",
  "development","developments","life","insurance","bank","finance","financial","global","international",
  "london","manchester","birmingham","scotland","england","britain","uk","gb","union","street","square",
  "park","central","north","south","east","west","city","new","old","royal","crown","cross","bridge",
  "court","house","tower","place","gate","green","blue","red","black","white","grey","gold",
  "silver","jones","smith","brown","taylor","williams","wilson","king","wright","walker","young",
  "hall","fox","bay","bell","stone","wood","hill","field","wells","ford","port","hampton",
  "client","council","offices","office","interior","retail","commercial","residential",
  "industrial","buildings","building","trust","fund","funds","equity","ventures","ltd",
  "llp","plc","inc","co","company","credit","suisse","barclays","lloyds","halifax",
  "alpine","paper","stiff","trevillion","allies","morrison","hargreaves",
  "buckley","gray","yeoman","grosvenor","langham","tanglin","truenorth","tuckerman","yas",
  "miral","handal","modon","seaforth","land","hera","lipton","rogers",
  "lazari","kadans","tritax","segro","prologis","derwent","helical","workspace","wework",
  "berkeley","beam","cbre","jll","savills","colliers","cushman","wakefield","avison","bnp",
  "paribas","arup","aecom","wsp","mott","macdonald","arcadis","atkins","jacobs","ramboll",
  "gleeds","gardiner","theobald","currie","mace","skanska","multiplex","laing","orourke",
  "balfour","beatty","kier","morgan","sindall","wates","isg","lendlease","bouygues","vinci","bam",
  "john","street","lewis","james","henry","david","peter","paul","robert","george","william",
  "charles","edward","richard","thomas","michael","andrew","anthony","nicholas","timothy",
  "christopher","alexander","jonathan","matthew","stephen","simon","martin","alan","ian",
  "neil","mark","barry","gary","colin","keith","kenneth","derek","nigel","clive","trevor",
  "stanley","douglas","roger","graham","eric","stewart","malcolm","rodney","reginald",
  "arthur","bertram","clifford","cyril","edgar","gilbert","harold","howard","humphrey",
  "leonard","lionel","montague","noel","oswald","percival","quentin","rupert","sydney",
  "urban","victor","walter","woodrow","xavier","zachary",
  "anne","diana","helen","jane","joan","joyce","june","kate","lisa","mary","ruth","sarah",
  "susan","alice","amanda","angela","caroline","claire","deborah","eleanor","emma","fiona",
  "gillian","harriet","isabelle","jacqueline","katherine","laura","margaret","natalie",
  "olivia","patricia","rachel","rebecca","samantha","stephanie","victoria","wendy",
  "rougemont","brayfoxsmith","arab","british","chamber","commerce",
]);

interface MondayItem {
  id: string;
  name: string;
  column_values: Array<{ id: string; text: string; value: string; linked_items?: { id: string }[] }>;
}

async function fetchAllItems(apiKey: string, boardId: number): Promise<MondayItem[]> {
  const all: MondayItem[] = [];
  let cursor: string | null = null;
  let fetches = 0;
  while (fetches < 20) {
    const query: string = !cursor
      ? `query { boards(ids:[${boardId}]) { items_page(limit:500) { cursor items { id name column_values { id text value ... on BoardRelationValue { linked_items { id } } } } } } }`
      : `query { next_items_page(limit:500, cursor:"${cursor}") { cursor items { id name column_values { id text value ... on BoardRelationValue { linked_items { id } } } } } }`;
    const res: Response = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const page: { cursor?: string | null; items?: MondayItem[] } | undefined =
      !cursor ? data.data?.boards?.[0]?.items_page : data.data?.next_items_page;
    all.push(...(page?.items || []));
    cursor = page?.cursor ?? null;
    if (!cursor) break;
    fetches++;
  }
  return all;
}

function normalizeForDuplicates(name: string): string {
  return name.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(ltd|limited|llp|inc|plc|group|holdings|international|uk|gb|advisors|advisers|llc|the|of|and)\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function segmentWords(s: string): string[] | null {
  const lower = s.toLowerCase();
  const result: string[] = [];
  let i = 0;
  while (i < lower.length) {
    let matched = false;
    for (let len = Math.min(14, lower.length - i); len >= 2; len--) {
      const candidate = lower.slice(i, i + len);
      if (KNOWN_WORDS.has(candidate)) {
        result.push(candidate);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) return null;
  }
  return result;
}

function suggestWordSplit(name: string): string | null {
  if (name.includes(" ") || name.length < 8) return null;
  if (!/^[a-zA-Z]+$/.test(name)) return null;

  const flat = name.toLowerCase();
  const words = segmentWords(flat);
  if (!words || words.length < 2) return null;

  return words
    .map(w => w === "and" ? "&" : w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function suggestCommaStrip(name: string): string | null {
  if (!name.includes(",")) return null;
  const beforeOpenParen = name.split("(")[0];
  if (!beforeOpenParen.includes(",")) return null;
  const stripped = beforeOpenParen.split(",")[0].trim();
  if (stripped.length < 2 || stripped === name.trim()) return null;
  return stripped;
}

interface AccountWithContacts {
  id: string;
  name: string;
  contactIds: Set<string>;
}

function findDuplicateClusters(
  accounts: AccountWithContacts[],
): Array<{ canonical: AccountWithContacts; duplicates: AccountWithContacts[]; reason: string }> {
  const byNorm = new Map<string, AccountWithContacts[]>();
  for (const acc of accounts) {
    const norm = normalizeForDuplicates(acc.name);
    if (!norm) continue;
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm)!.push(acc);
  }

  const clusters: Array<{ canonical: AccountWithContacts; duplicates: AccountWithContacts[]; reason: string }> = [];

  for (const [, group] of byNorm) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      const contactDiff = b.contactIds.size - a.contactIds.size;
      if (contactDiff !== 0) return contactDiff;
      return b.name.length - a.name.length;
    });
    const [canonical, ...duplicates] = sorted;
    clusters.push({ canonical, duplicates, reason: "Exact normalized match" });
  }

  const inCluster = new Set<string>();
  for (const c of clusters) {
    inCluster.add(c.canonical.id);
    c.duplicates.forEach(d => inCluster.add(d.id));
  }

  const remaining = accounts.filter(a => !inCluster.has(a.id) && a.contactIds.size > 0);

  for (let i = 0; i < remaining.length; i++) {
    const a = remaining[i];
    if (inCluster.has(a.id)) continue;
    const matches: AccountWithContacts[] = [];

    for (let j = i + 1; j < remaining.length; j++) {
      const b = remaining[j];
      if (inCluster.has(b.id)) continue;

      const normA = normalizeForDuplicates(a.name);
      const normB = normalizeForDuplicates(b.name);
      const minLen = Math.min(normA.length, normB.length);
      if (minLen < 3) continue;

      const prefixLen = Math.min(5, minLen);
      const prefixMatch = normA.slice(0, prefixLen) === normB.slice(0, prefixLen);
      if (!prefixMatch) continue;

      const sharedContacts = Array.from(a.contactIds).filter(c => b.contactIds.has(c)).length;
      const overlap = sharedContacts / Math.max(1, Math.min(a.contactIds.size, b.contactIds.size));

      if (overlap >= 0.3 || Math.abs(normA.length - normB.length) <= 4) {
        matches.push(b);
        inCluster.add(b.id);
      }
    }

    if (matches.length > 0) {
      const all = [a, ...matches];
      const sorted = [...all].sort((x, y) => {
        const contactDiff = y.contactIds.size - x.contactIds.size;
        if (contactDiff !== 0) return contactDiff;
        return y.name.length - x.name.length;
      });
      const [canonical, ...duplicates] = sorted;
      inCluster.add(canonical.id);
      clusters.push({ canonical, duplicates, reason: "Fuzzy match (prefix + contact overlap)" });
    }
  }

  return clusters;
}

export async function GET() {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  console.log("[cleanup-analyze] Loading accounts and contacts...");
  const [rawAccounts, rawContacts] = await Promise.all([
    fetchAllItems(apiKey, ACCOUNTS_BOARD_ID),
    fetchAllItems(apiKey, CONTACTS_BOARD_ID),
  ]);
  console.log(`[cleanup-analyze] Loaded ${rawAccounts.length} accounts and ${rawContacts.length} contacts`);

  const accountToContacts = new Map<string, Set<string>>();
  for (const contact of rawContacts) {
    const accCol = contact.column_values.find(c => c.id === "contact_account");
    const linked = accCol?.linked_items || [];
    for (const li of linked) {
      if (!accountToContacts.has(li.id)) accountToContacts.set(li.id, new Set());
      accountToContacts.get(li.id)!.add(contact.id);
    }
  }

  const accountsWithContacts: AccountWithContacts[] = rawAccounts.map(a => ({
    id: a.id,
    name: a.name,
    contactIds: accountToContacts.get(a.id) || new Set(),
  }));

  const wordSplits: Array<{ id: string; current: string; suggested: string }> = [];
  const commaStrips: Array<{ id: string; current: string; suggested: string }> = [];

  for (const acc of accountsWithContacts) {
    const split = suggestWordSplit(acc.name);
    if (split) {
      wordSplits.push({ id: acc.id, current: acc.name, suggested: split });
      continue;
    }
    const stripped = suggestCommaStrip(acc.name);
    if (stripped) {
      commaStrips.push({ id: acc.id, current: acc.name, suggested: stripped });
    }
  }

  const duplicateClusters = findDuplicateClusters(accountsWithContacts).map(cluster => ({
    canonical: {
      id: cluster.canonical.id,
      name: cluster.canonical.name,
      contactCount: cluster.canonical.contactIds.size,
    },
    duplicates: cluster.duplicates.map(d => ({
      id: d.id,
      name: d.name,
      contactCount: d.contactIds.size,
    })),
    reason: cluster.reason,
    totalContactsToMove: cluster.duplicates.reduce((sum, d) => sum + d.contactIds.size, 0),
  }));

  console.log(
    `[cleanup-analyze] Found: ${wordSplits.length} word splits, ${commaStrips.length} comma strips, ${duplicateClusters.length} duplicate clusters`,
  );

  return NextResponse.json({
    summary: {
      totalAccounts: rawAccounts.length,
      wordSplits: wordSplits.length,
      commaStrips: commaStrips.length,
      duplicateClusters: duplicateClusters.length,
      totalDuplicatesToMerge: duplicateClusters.reduce((sum, c) => sum + c.duplicates.length, 0),
    },
    wordSplits,
    commaStrips,
    duplicateClusters,
  });
}
