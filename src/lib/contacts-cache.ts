export interface CachedContact {
  id: string;
  name: string;
  company: string;
  director: string;
  position: string;
  accountId: string | null;
}

let _cache: CachedContact[] = [];
let _cacheTime = 0;
const TTL = 1000 * 60 * 10;

export function isCacheStale(): boolean {
  return Date.now() - _cacheTime >= TTL || _cache.length === 0;
}

export function getContactCache(): CachedContact[] {
  return _cache;
}

export function setContactCache(items: CachedContact[]): void {
  _cache = items;
  _cacheTime = Date.now();
}

const CONTACTS_BOARD_ID = 1461714569;

export async function loadContactCache(apiKey: string): Promise<void> {
  if (!isCacheStale()) return;

  const items: CachedContact[] = [];
  let cursor: string | null = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const pageArg = cursor ? `limit: 250, cursor: "${cursor}"` : `limit: 250`;
    const gql = `query {
      boards(ids: [${CONTACTS_BOARD_ID}]) {
        items_page(${pageArg}) {
          cursor
          items {
            id
            name
            column_values(ids: ["text8", "people__1", "text_mm25ab00", "contact_account"]) {
              id
              text
              ... on BoardRelationValue { linked_items { id } }
            }
          }
        }
      }
    }`;

    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: gql }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const page = json.data?.boards?.[0]?.items_page;
    cursor = page?.cursor ?? null;

    for (const item of (page?.items ?? [])) {
      const text8 = item.column_values?.find((c: { id: string }) => c.id === "text8")?.text || "";
      const people = item.column_values?.find((c: { id: string }) => c.id === "people__1")?.text || "";
      const position = item.column_values?.find((c: { id: string }) => c.id === "text_mm25ab00")?.text || "";
      const acctCol = item.column_values?.find((c: { id: string }) => c.id === "contact_account");
      const accountId = acctCol?.linked_items?.[0]?.id ?? null;
      items.push({ id: item.id, name: item.name, company: text8, director: people.toLowerCase(), position, accountId });
    }

    if (!cursor) break;
  }

  setContactCache(items);
}
