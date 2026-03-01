"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBar } from "@/components/dashboard/topbar";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const monthlyIncome = [
  { month: "Jan", full: 180000, seventyFive: 135000 },
  { month: "Feb", full: 210000, seventyFive: 157500 },
  { month: "Mar", full: 195000, seventyFive: 146250 },
  { month: "Apr", full: 240000, seventyFive: 180000 },
  { month: "May", full: 225000, seventyFive: 168750 },
  { month: "Jun", full: 270000, seventyFive: 202500 },
];

const TARGET_REVENUE = 250000;

const expenses = [
  { category: "Salaries", amount: 85000 },
  { category: "Software", amount: 12000 },
  { category: "Office", amount: 8000 },
  { category: "Marketing", amount: 15000 },
  { category: "Travel", amount: 6000 },
];

const PIE_COLORS = ["#DC2626", "#2563EB", "#F59E0B", "#10B981", "#8B5CF6"];

const cashflowTrend = [
  { month: "Jan", balance: 180000 },
  { month: "Feb", balance: 195000 },
  { month: "Mar", balance: 210000 },
  { month: "Apr", balance: 232000 },
  { month: "May", balance: 248000 },
  { month: "Jun", balance: 265000 },
];

const profitLoss = [
  { month: "Jan", revenue: 180000, costs: 126000 },
  { month: "Feb", revenue: 210000, costs: 135000 },
  { month: "Mar", revenue: 195000, costs: 128000 },
  { month: "Apr", revenue: 240000, costs: 142000 },
  { month: "May", revenue: 225000, costs: 138000 },
  { month: "Jun", revenue: 270000, costs: 150000 },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Finance" />

      <div className="flex-1 p-8 bg-gray-50">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Revenue", value: "£1,320,000", change: "+8.2%" },
            { label: "Total Expenses", value: "£819,000", change: "+3.1%" },
            { label: "Net Profit", value: "£501,000", change: "+14.6%" },
            { label: "Cashflow Balance", value: "£265,000", change: "+5.4%" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                <p className="text-xs text-green-600 mt-1">{kpi.change} vs last period</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Planner */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Income Planner</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyIncome} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} width={80} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <ReferenceLine
                    y={TARGET_REVENUE}
                    stroke="#333"
                    strokeDasharray="5 5"
                    label={{ value: `Target: ${formatCurrency(TARGET_REVENUE)}`, position: "right", fill: "#333", fontSize: 12 }}
                  />
                  <Bar dataKey="full" name="100% Income" fill="#DC2626" />
                  <Bar dataKey="seventyFive" name="75% Income" fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenses} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                    {expenses.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cashflow Trend */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Cashflow Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cashflowTrend} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} width={80} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="balance" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Profit & Loss */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Profit &amp; Loss</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitLoss} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} width={80} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#10B981" />
                  <Bar dataKey="costs" name="Costs" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
