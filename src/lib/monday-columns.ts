import "server-only";

const ACCOUNTS_BOARD_ID = 1461714573;

interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

let cachedColumns: { logoUrlColId: string; logoSourceColId: string } | null = null;

export async function ensureLogoColumns(apiKey: string): Promise<{ logoUrlColId: string; logoSourceColId: string }> {
  if (cachedColumns) return cachedColumns;

  const query = `query { boards(ids: [${ACCOUNTS_BOARD_ID}]) { columns { id title type } } }`;
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  const columns: MondayColumn[] = data.data?.boards?.[0]?.columns || [];

  let logoUrlCol = columns.find(c => c.title.toLowerCase() === "logo url");
  let logoSourceCol = columns.find(c => c.title.toLowerCase() === "logo source");

  if (!logoUrlCol) {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({
        query: `mutation { create_column (board_id: ${ACCOUNTS_BOARD_ID}, title: "Logo URL", column_type: text) { id title type } }`,
      }),
    });
    const d = await r.json();
    logoUrlCol = d.data?.create_column;
    if (!logoUrlCol) throw new Error("Failed to create Logo URL column: " + JSON.stringify(d.errors));
  }

  if (!logoSourceCol) {
    const r = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey, "API-Version": "2024-01" },
      body: JSON.stringify({
        query: `mutation { create_column (board_id: ${ACCOUNTS_BOARD_ID}, title: "Logo Source", column_type: text) { id title type } }`,
      }),
    });
    const d = await r.json();
    logoSourceCol = d.data?.create_column;
    if (!logoSourceCol) throw new Error("Failed to create Logo Source column: " + JSON.stringify(d.errors));
  }

  cachedColumns = { logoUrlColId: logoUrlCol.id, logoSourceColId: logoSourceCol.id };
  console.log("[monday-columns] Logo URL column id:", cachedColumns.logoUrlColId);
  console.log("[monday-columns] Logo Source column id:", cachedColumns.logoSourceColId);
  return cachedColumns;
}
