"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface MonthData { month: string; cashIn: number; cashOut: number; }
interface CashflowData { months: MonthData[]; totalCashIn: number; totalCashOut: number; difference: number; }

const fmt = (v: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

/**
 * Returns a green or red color whose intensity scales with the magnitude of
 * the net cash flow relative to the largest absolute value in the dataset.
 */
function getMonthColor(diff: number, maxAbs: number): string {
  const t = maxAbs === 0 ? 0 : Math.abs(diff) / maxAbs; // 0‑1 intensity
  if (diff >= 0) {
    // Light green → deep green  (HSL 142°, 71% sat, lightness 85% → 35%)
    return `hsl(142, 71%, ${85 - t * 50}%)`;
  }
  // Light red → deep red  (HSL 0°, 72% sat, lightness 85% → 35%)
  return `hsl(0, 72%, ${85 - t * 50}%)`;
}

export function IncomePlannerChart() {
  const [data, setData] = useState<CashflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    fetch("/api/xero/cashflow").then(async (res) => {
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { setNeedsAuth(true); setLoading(false); return; }
      if (!res.ok || json.error) { setNeedsAuth(true); setLoading(false); return; }
      setData(json);
      setLoading(false);
    }).catch(() => { setNeedsAuth(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <Card className="shadow-sm border-gray-200 h-96 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading Xero Data...</div>
      </Card>
    );
  }

  if (needsAuth) {
    return (
      <Card className="shadow-sm border-gray-200 h-96 flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">Xero Disconnected</p>
        <p className="text-sm text-gray-500">Connect Xero to see live cash flow data.</p>
        <a href="/api/xero/auth" className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-md">
          Connect to Xero
        </a>
      </Card>
    );
  }

  const isPositive = (data?.difference ?? 0) >= 0;

  // Pre-compute per-month net flow and the max absolute value for scaling
  const months = data?.months || [];
  const diffs = months.map(m => m.cashIn - m.cashOut);
  const maxAbsDiff = Math.max(...diffs.map(Math.abs), 1);

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 text-center">
          Cash in and out - Last 6 months
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xl font-bold text-gray-900">{fmt(data?.totalCashIn ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Cash in</p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-700">{fmt(data?.totalCashOut ?? 0)}</p>
            <p className="text-xs text-gray-500 mt-1">Cash out</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${isPositive ? "text-green-700" : "text-red-700"}`}>
              {fmt(data?.difference ?? 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Difference</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data?.months || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ backgroundColor: "white", borderRadius: "8px", border: "1px solid #e5e7eb" }} formatter={(value: any) => [`${Number(value).toLocaleString()}`, undefined]} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
            <Bar dataKey="cashIn" name="Cash in" radius={[4, 4, 0, 0]}>
              {months.map((m, i) => (
                <Cell key={i} fill={getMonthColor(diffs[i], maxAbsDiff)} />
              ))}
            </Bar>
            <Bar dataKey="cashOut" name="Cash out" radius={[4, 4, 0, 0]}>
              {months.map((m, i) => (
                <Cell key={i} fill={getMonthColor(diffs[i], maxAbsDiff)} opacity={0.45} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}