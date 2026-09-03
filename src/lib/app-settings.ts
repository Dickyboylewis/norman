export interface AppSettings {
  sidebarOrder: string[];
  theme: "light" | "dark";
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  sidebarOrder: [
    "dashboard",
    "studio",
    "projects",
    "finance",
    "sales",
    "hr",
    "operations",
    "it",
    "premises",
    "resourcing",
  ],
  theme: "light",
};

export function validateAppSettings(input: unknown): input is AppSettings {
  if (typeof input !== "object" || input === null) return false;
  const s = input as Record<string, unknown>;
  if (!Array.isArray(s.sidebarOrder)) return false;
  if (!s.sidebarOrder.every((id) => typeof id === "string" && id.length > 0)) return false;
  if (new Set(s.sidebarOrder).size !== s.sidebarOrder.length) return false;
  if (s.theme !== "light" && s.theme !== "dark") return false;
  return true;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  const body = await res.json();
  return validateAppSettings(body) ? body : DEFAULT_APP_SETTINGS;
}
