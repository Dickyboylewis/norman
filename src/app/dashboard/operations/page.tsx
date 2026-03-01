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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const projectStatus = [
  { project: "Website Redesign", progress: 85 },
  { project: "CRM Migration", progress: 60 },
  { project: "Warehouse Fit-Out", progress: 40 },
  { project: "ISO Certification", progress: 72 },
  { project: "Fleet Renewal", progress: 30 },
];

const deliveryMetrics = [
  { month: "Jan", onTime: 92, delayed: 8 },
  { month: "Feb", onTime: 88, delayed: 12 },
  { month: "Mar", onTime: 95, delayed: 5 },
  { month: "Apr", onTime: 90, delayed: 10 },
  { month: "May", onTime: 93, delayed: 7 },
  { month: "Jun", onTime: 96, delayed: 4 },
];

const tasksOpen = [
  { month: "Jan", open: 34, closed: 28 },
  { month: "Feb", open: 42, closed: 36 },
  { month: "Mar", open: 38, closed: 40 },
  { month: "Apr", open: 30, closed: 35 },
  { month: "May", open: 26, closed: 32 },
  { month: "Jun", open: 22, closed: 30 },
];

const teamPerformance = [
  { metric: "Speed", score: 85 },
  { metric: "Quality", score: 90 },
  { metric: "Budget", score: 75 },
  { metric: "Communication", score: 88 },
  { metric: "Innovation", score: 70 },
  { metric: "Compliance", score: 95 },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Operations" />

      <div className="flex-1 p-8 bg-gray-50">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Projects", value: "5" },
            { label: "On-Time Delivery", value: "96%" },
            { label: "Open Tasks", value: "22" },
            { label: "Team Efficiency", value: "88%" },
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
          {/* Project Progress */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Project Progress</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectStatus} layout="vertical" margin={{ top: 20, right: 20, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="project" type="category" />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="progress" name="Progress %" fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Delivery Metrics */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Delivery Performance</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliveryMetrics} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTime" name="On Time %" stackId="a" fill="#10B981" />
                  <Bar dataKey="delayed" name="Delayed %" stackId="a" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Open vs Closed Tasks */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Open vs Closed Tasks</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tasksOpen} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="open" name="Open" stroke="#DC2626" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="closed" name="Closed" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Team Performance Radar */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={teamPerformance} cx="50%" cy="50%" outerRadius={80}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Score" dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
