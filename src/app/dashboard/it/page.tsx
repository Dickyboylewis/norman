"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBar } from "@/components/dashboard/topbar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const tickets = [
  { month: "Jan", opened: 45, resolved: 40 },
  { month: "Feb", opened: 52, resolved: 48 },
  { month: "Mar", opened: 38, resolved: 42 },
  { month: "Apr", opened: 60, resolved: 55 },
  { month: "May", opened: 48, resolved: 50 },
  { month: "Jun", opened: 35, resolved: 38 },
];

const uptime = [
  { month: "Jan", uptime: 99.8 },
  { month: "Feb", uptime: 99.5 },
  { month: "Mar", uptime: 99.9 },
  { month: "Apr", uptime: 99.7 },
  { month: "May", uptime: 99.95 },
  { month: "Jun", uptime: 99.99 },
];

const ticketCategories = [
  { category: "Hardware", value: 30 },
  { category: "Software", value: 45 },
  { category: "Network", value: 15 },
  { category: "Access", value: 22 },
  { category: "Other", value: 8 },
];

const PIE_COLORS = ["#DC2626", "#2563EB", "#F59E0B", "#10B981", "#8B5CF6"];

const spendByCategory = [
  { category: "Cloud / SaaS", spend: 18000 },
  { category: "Hardware", spend: 12000 },
  { category: "Licences", spend: 9500 },
  { category: "Support", spend: 6000 },
  { category: "Security", spend: 8500 },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ITPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="IT" />

      <div className="flex-1 p-8 bg-gray-50">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Open Tickets", value: "12" },
            { label: "Avg Resolution", value: "4.2 hrs" },
            { label: "Uptime", value: "99.99%" },
            { label: "Monthly IT Spend", value: "£54,000" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Support Tickets */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Support Tickets</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tickets} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="opened" name="Opened" fill="#DC2626" />
                  <Bar dataKey="resolved" name="Resolved" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* System Uptime */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>System Uptime %</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={uptime} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[99, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="uptime" name="Uptime %" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ticket Categories */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Tickets by Category</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ticketCategories} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                    {ticketCategories.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* IT Spend */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Monthly IT Spend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendByCategory} layout="vertical" margin={{ top: 20, right: 20, bottom: 5, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis dataKey="category" type="category" />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="spend" name="Spend" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
