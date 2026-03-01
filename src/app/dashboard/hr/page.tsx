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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const headcount = [
  { department: "Sales", count: 12 },
  { department: "Finance", count: 6 },
  { department: "Operations", count: 10 },
  { department: "IT", count: 8 },
  { department: "HR", count: 3 },
  { department: "Premises", count: 4 },
];

const PIE_COLORS = ["#DC2626", "#2563EB", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];

const absences = [
  { month: "Jan", sick: 4, holiday: 8 },
  { month: "Feb", sick: 3, holiday: 6 },
  { month: "Mar", sick: 5, holiday: 10 },
  { month: "Apr", sick: 2, holiday: 12 },
  { month: "May", sick: 3, holiday: 14 },
  { month: "Jun", sick: 1, holiday: 16 },
];

const satisfaction = [
  { month: "Jan", score: 72 },
  { month: "Feb", score: 74 },
  { month: "Mar", score: 71 },
  { month: "Apr", score: 78 },
  { month: "May", score: 80 },
  { month: "Jun", score: 82 },
];

const training = [
  { name: "Compliance", completed: 38, total: 43 },
  { name: "Health & Safety", completed: 40, total: 43 },
  { name: "DEI", completed: 32, total: 43 },
  { name: "Skills", completed: 28, total: 43 },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HRPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="HR" />

      <div className="flex-1 p-8 bg-gray-50">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Headcount", value: "43" },
            { label: "Open Positions", value: "5" },
            { label: "Avg Tenure", value: "2.4 yrs" },
            { label: "Satisfaction", value: "82%" },
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
          {/* Headcount by Department */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Headcount by Department</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={headcount} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={90} label={({ department, percent }) => `${department} ${(percent * 100).toFixed(0)}%`}>
                    {headcount.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Absences */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Absences (Sick vs Holiday)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={absences} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sick" name="Sick Days" fill="#DC2626" />
                  <Bar dataKey="holiday" name="Holiday" fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Employee Satisfaction Trend */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Employee Satisfaction Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={satisfaction} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[60, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" name="Score %" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Training Completion */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Training Completion</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={training} layout="vertical" margin={{ top: 20, right: 20, bottom: 5, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 43]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#10B981" />
                  <Bar dataKey="total" name="Total Required" fill="#E5E7EB" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
