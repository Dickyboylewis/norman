"use client";

/**
 * Settings Page
 *
 * Notification controls, sidebar ordering, and appearance preferences.
 * Sits outside the /dashboard segment, so it renders its own Sidebar and
 * TopBar with the same offsets as the dashboard layout.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TopBar } from "@/components/dashboard/topbar";
import { Sidebar, orderNavItems } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import PushManager from "@/components/PushManager";
import TestNotificationButton from "@/components/TestNotificationButton";
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  type AppSettings,
} from "@/lib/app-settings";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    initialData: DEFAULT_APP_SETTINGS,
    initialDataUpdatedAt: 0,
  });

  const orderedItems = orderNavItems(settings.sidebarOrder);

  const saveSettings = async (next: AppSettings) => {
    setSaveError(false);
    queryClient.setQueryData(["app-settings"], next);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error(`Settings save failed: ${res.status}`);
    } catch (error) {
      console.error(error);
      setSaveError(true);
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const ids = orderedItems.map((item) => item.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void saveSettings({ ...settings, sidebarOrder: ids });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-14 md:pt-0 md:pl-64">
        <main className="flex min-h-screen flex-col">
          <TopBar title="Settings" subtitle="Preferences for White Red Hub" />

          <div className="flex-1 space-y-6 bg-gray-50 p-4 md:p-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Push Notifications</p>
                  <p className="text-xs text-gray-500">Stay up to date with real-time alerts from White Red Hub.</p>
                </div>
                <PushManager />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Test Notifications</p>
                  <p className="text-xs text-gray-500">Send a test notification to verify everything is working.</p>
                </div>
                <TestNotificationButton />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="font-[Poppins] text-lg font-semibold text-gray-900">
                    Sidebar Order
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Arrange the navigation to suit how you work. Changes apply immediately.
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-gray-100">
                    {orderedItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id} className="flex items-center gap-3 py-2">
                          <Icon className="h-4 w-4 flex-shrink-0 text-[#DA2C26]" />
                          <span className="flex-1 text-sm font-medium text-gray-800">
                            {item.label}
                          </span>
                          <button
                            type="button"
                            aria-label={`Move ${item.label} up`}
                            disabled={index === 0}
                            onClick={() => moveItem(index, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${item.label} down`}
                            disabled={index === orderedItems.length - 1}
                            onClick={() => moveItem(index, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {saveError ? (
                    <p className="mt-3 text-xs font-medium text-red-500">
                      Could not save your settings. Please try again.
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="h-fit border-gray-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="font-[Poppins] text-lg font-semibold text-gray-900">
                    Appearance
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Choose how White Red Hub looks for you.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Dark theme</p>
                      <p className="text-xs text-gray-400">Dark theme styling coming soon</p>
                    </div>
                    <Switch
                      checked={settings.theme === "dark"}
                      onCheckedChange={(checked) =>
                        void saveSettings({ ...settings, theme: checked ? "dark" : "light" })
                      }
                      aria-label="Dark theme"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
