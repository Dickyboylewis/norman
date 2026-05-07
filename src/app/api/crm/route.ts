import { NextResponse } from "next/server";
import type { AccountNode, AccountEdge, ContactNode } from "@/types/crm";

export const dynamic = "force-dynamic";

export type { AccountNode, AccountEdge, ContactNode };

interface MondayColumnValue {
  id: string;
  text: string;
  value: string;
  linked_items?: { id: string }[];
}

interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

const CRE_DOMAIN_MAP: Record<string, string> = {
  "CBRE": "cbre.com",
  "JLL": "jll.com",
  "Savills": "savills.com",
  "Knight Frank": "knightfrank.com",
  "Colliers": "colliers.com",
  "Colliers International": "colliers.com",
  "Cushman & Wakefield": "cushmanwakefield.com",
  "Avison Young": "avisonyoung.co.uk",
  "Arup": "arup.com",
  "Aecom": "aecom.com",
  "WSP": "wsp.com",
  "Grosvenor": "grosvenor.com",
  "British Land": "britishland.com",
  "Nuveen": "nuveen.com",
  "BEAM": "beam.gg",
  "Kadans": "kadans.com",
  "Deloitte": "deloitte.com",
  "KPMG": "kpmg.com",
  "PwC": "pwc.com",
  "BNP Paribas Real Estate": "realestate.bnpparibas.co.uk",
  "Strutt & Parker": "struttandparker.com",
  "Gerald Eve": "geraldeve.com",
  "Montagu Evans": "montaguevans.com",
  "EY": "ey.com",
  "Arcadis": "arcadis.com",
  "Mott MacDonald": "mottmac.com",
  "Land Securities": "landsec.com",
  "Landsec": "landsec.com",
  "Derwent London": "derwentlondon.com",
  "GPE": "gpe.co.uk",
  "Great Portland Estates": "gpe.co.uk",
  "Helical": "helical.co.uk",
  "Workspace Group": "workspacegroup.co.uk",
  "WeWork": "wework.com",
  "IWG": "iwgplc.com",
  "Regus": "regus.com",
  "Industrious": "industriousoffice.com",
  "Turner and Townsend": "turnerandtownsend.com",
  "Gardiner & Theobalt": "gardiner-theobald.com",
  "Newton Perkins": "newtonperkins.co.uk",
  "Dorrington": "dorrington.co.uk",
  "Hines": "hines.com",
  // Short/partial-match aliases for common names
  "Cushman": "cushmanwakefield.com",
  "BNP": "realestate.bnpparibas.com",
  "Strutt": "struttandparker.com",
  "Montagu": "montaguevans.co.uk",
  "Mott": "mottmac.com",
  "Land Sec": "landsec.com",
  "Derwent": "derwentlondon.com",
  "Great Portland": "gpe.co.uk",
  "Workspace": "workspacegroup.co.uk",
  // Investors & fund managers
  "Brookfield": "brookfield.com",
  "Blackstone": "blackstone.com",
  "M&G": "mandg.com",
  "Columbia Threadneedle": "columbiathreadneedle.com",
  "Schroders": "schroders.com",
  "Legal and General": "legalandgeneral.com",
  "Legal & General": "legalandgeneral.com",
  "Standard Life": "standardlife.com",
  "Stanhope": "stanhope.co.uk",
  "Canary Wharf": "canarywharf.com",
  "Hammerson": "hammerson.com",
  "Intu": "intu.co.uk",
  "Peel": "peelland.com",
  "LaSalle": "lasalle.com",
  "CBRE GI": "cbre.com",
  "AXA": "axa-im.com",
  "Aberdeen": "abrdn.com",
  "Invesco": "invesco.com",
  "PGIM": "pgim.com",
  "Patrizia": "patrizia.ag",
  "Redevco": "redevco.com",
  "Segro": "segro.com",
  "Prologis": "prologis.com",
  "Tritax": "tritaxbigbox.co.uk",
  "Allianz": "allianz.com",
  "DWS": "dws.com",
  "Zurich": "zurich.co.uk",
  "Picton": "picton.co.uk",
  // Tech / corporates
  "Siemens": "siemens.com",
  "Amazon": "amazon.com",
  "Google": "google.com",
  "Microsoft": "microsoft.com",
  "Apple": "apple.com",
  "Meta": "meta.com",
  // Finance
  "HSBC": "hsbc.com",
  "Barclays": "barclays.com",
  "NatWest": "natwest.com",
  "Lloyds": "lloyds.com",
  "Goldman": "goldmansachs.com",
  "JP Morgan": "jpmorgan.com",
  "Morgan Stanley": "morganstanley.com",
  // Legal
  "Clifford Chance": "cliffordchance.com",
  "Linklaters": "linklaters.com",
  "Freshfields": "freshfields.com",
  "Allen & Overy": "allenovery.com",
  "Slaughter": "slaughterandmay.com",
  "Herbert Smith": "hsf.com",
  "CMS": "cms.law",
  "Mishcon": "mishcon.com",
  // Flex / coworking
  "Fora": "fora.space",
  "Landmark": "landmarkspace.co.uk",
  "TOG": "theofficegroup.co.uk",
  "The Office Group": "theofficegroup.co.uk",
  "Uncommon": "uncommon.co.uk",
  "Second Home": "secondhome.io",
  "Spaces": "spacesworks.com",
  // Architects
  "Orms": "orms.co.uk",
  "tp bennett": "tpbennett.com",
  "TP Bennett": "tpbennett.com",
  "Sheppard Robson": "sheppardrobson.com",
  "Hawkins Brown": "hawkinsbrown.com",
  "BDP": "bdp.com",
  "AHMM": "ahmm.co.uk",
  "Allford Hall": "ahmm.co.uk",
  "Buckley Gray": "buckleygrayyeoman.co.uk",
  "Penoyre": "penoyreandprasad.co.uk",
  "Scott Brownrigg": "scottbrownrigg.com",
  "Broadway Malyan": "broadwaymalyan.com",
  "HLM": "hlmarchitects.com",
  "RSHP": "rshp.com",
  "Rogers Stirk": "rshp.com",
  "Grimshaw": "grimshaw.global",
  "Zaha Hadid": "zaha-hadid.com",
  "Foster": "fosterandpartners.com",
  "Fosters": "fosterandpartners.com",
  "Skidmore": "som.com",
  "SOM": "som.com",
  "Gensler": "gensler.com",
  "HOK": "hok.com",
  "BIG": "big.dk",
  "Bjarke": "big.dk",
  "Populous": "populous.com",
  "Perkins": "perkinsandwill.com",
  "CallisonRTKL": "callisonrtkl.com",
  "Ryder": "ryderarchitecture.com",
  "DLA": "dla-design.co.uk",
  "Rolfe Judd": "rolfejudd.com",
  "Assael": "assael.co.uk",
  "PRP": "prparchitects.co.uk",
  "Carey Jones": "careyjones.com",
  "Stiff": "stiffandtrevillion.co.uk",
  "Allies": "alliesandmorrison.com",
  "David Chipperfield": "davidchipperfield.com",
  "Chipperfield": "davidchipperfield.com",
  "Eric Parry": "ericparry.com",
  "Squire": "squireandpartners.com",
  "Stanton Williams": "stantonwilliams.com",
  "Wilkinson Eyre": "wilkinsoneyre.com",
  "Make": "makearchitects.com",
  "Glenn Howells": "glennhowells.co.uk",
  "Haworth Tompkins": "haworthtompkins.com",
  "Coffey": "coffeyarchitects.com",
  // Main contractors
  "Turner": "turnerconstruction.com",
  "Multiplex": "multiplex.global",
  "Skanska": "skanska.co.uk",
  "Mace": "macegroup.com",
  "Laing": "laingorourke.com",
  "Balfour": "balfourbeatty.com",
  "Kier": "kier.co.uk",
  "Morgan Sindall": "morgansindall.com",
  "ISG": "isgplc.com",
  "Wates": "wates.co.uk",
  "McLaughlin": "mclaughlinharvey.com",
  "Bouygues": "bouygues-uk.com",
  "Vinci": "vinci-construction-uk.com",
  "BAM": "bamconstruct.co.uk",
  "Galliford": "gallifordtry.co.uk",
  "Lendlease": "lendlease.com",
  // Cost consultants / PM
  "Cannonway": "cannonway.co.uk",
  "Faithful": "fandgould.com",
  "Gardiner": "gardinerandtheobald.com",
  "Currie": "currieandbrowngroup.com",
  "Turner Townsend": "turnerandtownsend.com",
  "Gleeds": "gleeds.com",
  "Atkins": "atkinsglobal.com",
  "Jacobs": "jacobs.com",
  "Buro Happold": "burohappold.com",
  "Ramboll": "ramboll.com",
  "Expedition": "expedition.uk.com",
  "Price Myers": "pricemyers.com",
  "Elliott Wood": "elliottwood.co.uk",
  "Waterman": "watermangroup.com",
  "Peter Brett": "peterbrett.com",
  "Amey": "amey.co.uk",
  "Capita": "capita.com",
  "Hoare Lea": "hoarelea.com",
  "Hilson Moran": "hilsonmoran.com",
  "Chapman": "chapmanbdsp.com",
  "Cundall": "cundall.com",
  "Elementa": "elementaconsulting.com",
  "Max Fordham": "maxfordham.com",
  "Useful Simple": "usefulsimple.com",
  "Whitby": "whitbybird.com",
  "BuroFour": "burofour.co.uk",
  "Buro Four": "burofour.co.uk",
  "TFT": "tftconsultants.com",
  "Tuffin Ferraby": "tftconsultants.com",
  // Additional entries
  "BentallGreenOak": "bentallgreenoak.com",
  "BGO": "bentallgreenoak.com",
  "Bentall": "bentallgreenoak.com",
  "M&G Real Estate": "mandg.com",
  "Schroders Real Estate": "schroders.com",
  "Aberdeen Standard": "abrdn.com",
  "abrdn": "abrdn.com",
  "Tritax Big Box": "tritaxbigbox.co.uk",
  "Real PM": "realpm.co.uk",
  "Hawkins\\Brown": "hawkinsbrown.com",
  "Allford Hall Monaghan Morris": "ahmm.co.uk",
  "Foster + Partners": "fosterandpartners.com",
  "Foster and Partners": "fosterandpartners.com",
  "Make Architects": "makearchitects.com",
  "Allies & Morrison": "alliesandmorrison.com",
  "David Chipperfield Architects": "davidchipperfield.com",
  "Squire & Partners": "squireandpartners.com",
  "Squire and Partners": "squireandpartners.com",
  "BuroHappold": "burohappold.com",
  "WSP UK": "wsp.com",
  "Arup Group": "arup.com",
  "Skelly and Couch": "skellyandcouch.com",
  "Atelier Ten": "atelierten.com",
  "Eight Associates": "eightassociates.co.uk",
  "Inkling": "inklingllp.com",
  "Long & Partners": "longandpartners.co.uk",
  "Gardiner & Theobald": "gardiner-theobald.com",
  "Currie & Brown": "currieandbrown.com",
  "Faithful+Gould": "fgould.com",
  "Faithful and Gould": "fgould.com",
  "Mace Group": "macegroup.com",
  "Sir Robert McAlpine": "srm.com",
  "McAlpine": "srm.com",
  "BAM Construct": "bam.co.uk",
  "Wates Group": "wates.co.uk",
  "Kier Group": "kier.co.uk",
  "Laing O'Rourke": "laingorourke.com",
  "Lichfields": "lichfields.uk",
  "Quod": "quod.com",
  "DP9": "dp9.co.uk",
  "Strutt and Parker": "struttandparker.com",
  "DTZ": "cushmanwakefield.com",
  "GVA": "avisonyoung.co.uk",
  "Bilfinger GVA": "avisonyoung.co.uk",
  "Goldman Sachs": "goldmansachs.com",
  "AXA IM": "axa-im.com",
};

// Classify a contact type string using substring matching to handle
// compound Monday.com status labels like "Development Manager - Client" or "Agent (Leasing)".
function classifyContactType(contactType: string): "client" | "consultant" | "unknown" {
  const t = (contactType || "").toLowerCase();
  if (!t) return "unknown";
  // Client indicators — check first because compound types like "Development Manager - Client" end in "client"
  if (
    t.includes("client") ||
    t.includes("asset manager") ||
    t.includes("investor") ||
    t.includes("occupier") ||
    t.includes("developer") ||
    t.includes("owner") ||
    t.includes("ceo") ||
    t.includes("founder") ||
    t.includes("fund manager") ||
    t.includes("venture")
  ) return "client";
  // Consultant indicators
  if (
    t.includes("agent") ||
    t.includes("consultant") ||
    t.includes("engineer") ||
    t.includes("architect") ||
    t.includes("planning") ||
    t.includes("structural") ||
    t.includes("m&e") ||
    t.includes("quantity") ||
    t.includes("surveyor") ||
    t.includes("contractor") ||
    t.includes("designer") ||
    t === "qs" ||
    t === "pm" ||
    t.endsWith(" qs") ||
    t.endsWith(" pm") ||
    t.startsWith("pm ") ||
    t.startsWith("qs ")
  ) return "consultant";
  return "unknown";
}

function buildCluster(contacts: ContactNode[]): "clients" | "consultants" | "unknown" {
  let clientCount = 0;
  let consultantCount = 0;
  for (const c of contacts) {
    const cls = classifyContactType(c.contactType);
    if (cls === "client") clientCount++;
    else if (cls === "consultant") consultantCount++;
  }
  if (clientCount > consultantCount) return "clients";
  if (consultantCount > 0) return "consultants";
  if (contacts.length > 0) return "consultants";
  return "unknown";
}

// Resolves cluster using 3 priorities:
// P1 — Account's own Type field (most authoritative)
// P2 — Majority vote across linked contact types
// P3 — Default "consultants"
function resolveCluster(accountType: string, contacts: ContactNode[]): "clients" | "consultants" | "unknown" {
  const t = (accountType || "").toLowerCase();
  if (t.includes("client")) return "clients";
  if (
    t.includes("consultant") || t.includes("agent") || t.includes("engineer") ||
    t.includes("architect") || t.includes("contractor") || t.includes("surveyor") ||
    t.includes("qs") || t.includes("pm") || t.includes("planning") || t.includes("designer")
  ) return "consultants";
  return buildCluster(contacts);
}

export async function GET() {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing MONDAY_API_KEY" }, { status: 500 });
  }

  try {
    const [rawContacts, rawAccounts] = await Promise.all([
      fetchAllItems(apiKey, 1461714569),
      fetchAllItems(apiKey, 1461714573),
    ]);

    // Build accountMap from the Accounts board
    const accountMap = new Map<string, AccountNode>();
    for (const item of rawAccounts) {
      const rawDomain = getCol(item, "company_domain");
      const domain = cleanDomain(rawDomain) || guessDomain(item.name);
      accountMap.set(item.id, {
        id: item.id,
        name: item.name,
        domain,
        logoUrl: domain ? `/api/logo?domain=${domain}` : "",
        cluster: "unknown",
        accountType: getCol(item, "status"),
        contacts: [],
        contactCount: 0,
        directors: [],
      });
    }

    // Parse contacts; track text8 company name for fallback grouping
    const allContacts: ContactNode[] = [];
    // contactCompanyKey: lowercase company name used as grouping key
    const contactCompanyName = new Map<string, string>(); // id → original company name
    const contactCompanyDomain = new Map<string, string>(); // id → domain

    for (const item of rawContacts) {
      const company = getCol(item, "text8").trim();
      const rawDomain = getCol(item, "text_mm2563nr");
      const domain = cleanDomain(rawDomain) || guessDomain(company);
      if (company) {
        contactCompanyName.set(item.id, company);
        contactCompanyDomain.set(item.id, domain);
      }

      const contact: ContactNode = {
        id: item.id,
        name: item.name,
        contactType: getCol(item, "status"),
        directors: parseDirectors(getCol(item, "people__1")),
        position: getCol(item, "text_mm25ab00"),
        email: getCol(item, "contact_email"),
        phone: getCol(item, "contact_phone"),
        linkedIn: getCol(item, "text_mm255n59"),
        lastContacted: getCol(item, "date_mm25bz34"),
        notes: getCol(item, "long_text4"),
        connectedToIds: parseBoardRelation(item, "board_relation_mm25s0kr"),
      };

      allContacts.push(contact);

      // Link to account via board relation (contact_account column)
      const accountIds = parseBoardRelation(item, "contact_account");
      for (const accountId of accountIds) {
        const account = accountMap.get(accountId);
        if (account) {
          account.contacts.push(contact);
          for (const d of contact.directors) {
            if (!account.directors.includes(d)) account.directors.push(d);
          }
        }
      }
    }

    // Finalise board-linked accounts
    for (const account of accountMap.values()) {
      account.contactCount = account.contacts.length;
      account.cluster = resolveCluster(account.accountType, account.contacts);
    }

    let nodes = Array.from(accountMap.values()).filter(a => a.contactCount > 0);

    // ── Fallback: group by text8 company name ────────────────────────────────
    // Used when the contact_account board relation is empty (not yet configured
    // in Monday.com) — groups contacts by the plain-text company name field.
    if (nodes.length === 0) {
      const companyGroupMap = new Map<string, AccountNode>();
      let syntheticIdx = 0;

      for (const contact of allContacts) {
        const company = contactCompanyName.get(contact.id);
        if (!company) continue;

        const key = company.toLowerCase();
        if (!companyGroupMap.has(key)) {
          const domain = contactCompanyDomain.get(contact.id) || guessDomain(company);
          companyGroupMap.set(key, {
            id: `syn-${syntheticIdx++}`,
            name: company,
            domain,
            logoUrl: domain ? `/api/logo?domain=${domain}` : "",
            cluster: "unknown",
            accountType: "",
            contacts: [],
            contactCount: 0,
            directors: [],
          });
        }

        const account = companyGroupMap.get(key)!;
        account.contacts.push(contact);
        for (const d of contact.directors) {
          if (!account.directors.includes(d)) account.directors.push(d);
        }
      }

      for (const account of companyGroupMap.values()) {
        account.contactCount = account.contacts.length;
        account.cluster = resolveCluster(account.accountType, account.contacts);
        // If a later contact in the group has a better domain, upgrade
        if (!account.domain) {
          for (const c of account.contacts) {
            const d = contactCompanyDomain.get(c.id);
            if (d) { account.domain = d; account.logoUrl = `/api/logo?domain=${d}`; break; }
          }
        }
      }

      nodes = Array.from(companyGroupMap.values());
    }
    // ── End fallback ─────────────────────────────────────────────────────────

    // Build edges between accounts whose contacts are cross-linked
    const contactToAccount = new Map<string, string>();
    for (const account of nodes) {
      for (const contact of account.contacts) {
        contactToAccount.set(contact.id, account.id);
      }
    }

    const edgeSet = new Set<string>();
    const edges: AccountEdge[] = [];
    for (const account of nodes) {
      for (const contact of account.contacts) {
        for (const connectedId of contact.connectedToIds) {
          const targetAccountId = contactToAccount.get(connectedId);
          if (targetAccountId && targetAccountId !== account.id) {
            const key = [account.id, targetAccountId].sort().join(":");
            if (!edgeSet.has(key)) {
              edgeSet.add(key);
              edges.push({ source: account.id, target: targetAccountId, strength: 1 });
            }
          }
        }
      }
    }

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("[CRM API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function fetchAllItems(apiKey: string, boardId: number): Promise<MondayItem[]> {
  let all: MondayItem[] = [];
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

    if (!res.ok) throw new Error(`Monday.com API ${res.status}`);
    const data: {
      errors?: unknown;
      data?: {
        boards?: { items_page: { cursor?: string | null; items?: MondayItem[] } }[];
        next_items_page?: { cursor?: string | null; items?: MondayItem[] };
      };
    } = await res.json();
    if (data.errors) throw new Error(JSON.stringify(data.errors));

    const page: { cursor?: string | null; items?: MondayItem[] } | undefined =
      !cursor ? data.data?.boards?.[0]?.items_page : data.data?.next_items_page;
    all = all.concat(page?.items || []);
    cursor = page?.cursor ?? null;
    if (!cursor) break;
    fetches++;
  }

  return all;
}

function getCol(item: MondayItem, id: string): string {
  return item.column_values.find(c => c.id === id)?.text || "";
}

function parseBoardRelation(item: MondayItem, id: string): string[] {
  const col = item.column_values.find(c => c.id === id);
  if (!col) return [];

  // Primary: BoardRelationValue inline fragment — reliable in API-Version 2024-01+
  if (Array.isArray(col.linked_items) && col.linked_items.length > 0) {
    return col.linked_items.map(li => li.id);
  }

  // Fallback: parse JSON value field (kept for older API responses)
  if (col.value) {
    try {
      const parsed = JSON.parse(col.value);
      if (Array.isArray(parsed.linkedPulseIds) && parsed.linkedPulseIds.length > 0) {
        return parsed.linkedPulseIds.map((x: { linkedPulseId: number } | number) =>
          String(typeof x === "object" ? x.linkedPulseId : x)
        );
      }
      if (Array.isArray(parsed.linkedItemIds) && parsed.linkedItemIds.length > 0) {
        return (parsed.linkedItemIds as number[]).map(String);
      }
      if (Array.isArray(parsed.item_ids) && parsed.item_ids.length > 0) {
        return (parsed.item_ids as number[]).map(String);
      }
    } catch { /* ignore */ }
  }

  return [];
}

function parseDirectors(text: string): string[] {
  if (!text) return [];
  const map: Record<string, string> = { "Joe Haire": "joe", "Jesus Jimenez": "jesus", "Dicky Lewis": "dicky" };
  return text.split(/[,\n]+/).map(s => s.trim()).map(n => map[n] || n.toLowerCase().split(" ")[0]).filter(Boolean);
}

function cleanDomain(raw: string): string {
  if (!raw) return "";
  let d = raw.trim();
  if (d.includes(" - ")) d = d.split(" - ")[0].trim();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return d;
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(ltd|limited|llp|inc|plc|group|holdings|international|uk|gb|advisors|advisers|partners|llc)\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function guessDomain(name: string): string {
  const norm = normalizeForMatch(name);
  if (!norm) return "";

  for (const [key, domain] of Object.entries(CRE_DOMAIN_MAP)) {
    const keyNorm = normalizeForMatch(key);
    if (norm === keyNorm) return domain;
  }
  for (const [key, domain] of Object.entries(CRE_DOMAIN_MAP)) {
    const keyNorm = normalizeForMatch(key);
    if (norm.startsWith(keyNorm + " ") || norm.startsWith(keyNorm)) return domain;
  }
  for (const [key, domain] of Object.entries(CRE_DOMAIN_MAP)) {
    const keyNorm = normalizeForMatch(key);
    if (keyNorm.length > 3 && norm.includes(keyNorm)) return domain;
  }
  const slug = norm.replace(/\s+/g, "").slice(0, 20);
  if (slug.length > 4) return `${slug}.com`;
  return "";
}
