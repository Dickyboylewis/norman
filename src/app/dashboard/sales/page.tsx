"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBar } from "@/components/dashboard/topbar";
import { ProspectingChart } from "@/components/dashboard/widgets/prospecting-chart";
import { DealRevenueChart } from "@/components/dashboard/widgets/deal-revenue-chart";
import { AskJebPanel } from "@/components/dashboard/ask-jeb/ask-jeb-panel";
import { MessageCircle } from "lucide-react";
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
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const prospecting = [
  { director: "Jesus", newLead: 40, attempted: 30, contacted: 50, appointments: 20 },
  { director: "Joe", newLead: 25, attempted: 20, contacted: 35, appointments: 15 },
  { director: "Dicky", newLead: 50, attempted: 40, contacted: 60, appointments: 30 },
];

const dealRevenue = [
  { name: "Jesus", revenue: 120000 },
  { name: "Joe", revenue: 95000 },
  { name: "Dicky", revenue: 110000 },
];

const pipelineMonthly = [
  { month: "Jan", deals: 12, value: 85000 },
  { month: "Feb", deals: 18, value: 120000 },
  { month: "Mar", deals: 15, value: 98000 },
  { month: "Apr", deals: 22, value: 155000 },
  { month: "May", deals: 19, value: 130000 },
  { month: "Jun", deals: 25, value: 175000 },
];

const conversionFunnel = [
  { stage: "Leads", value: 500, fill: "#FBBF24" },
  { stage: "Qualified", value: 320, fill: "#FB923C" },
  { stage: "Proposal", value: 180, fill: "#2563EB" },
  { stage: "Won", value: 65, fill: "#10B981" },
];

function getCurrentQuarter(): string {
  const month = new Date().getMonth();
  return `Q${Math.floor(month / 3) + 1}`;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const quarter = getCurrentQuarter();
  const [jebOpen, setJebOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Sales" />

      <div className="flex-1 p-4 md:p-8 bg-gray-50">
        {/* ─── Ask Jeb Banner ─────────────────────────────────────────── */}
        <button
          onClick={() => setJebOpen(true)}
          className="w-full mb-6 group cursor-pointer"
          aria-label="Ask Jeb Blount for sales coaching"
        >
          <div className="flex items-center gap-4 md:gap-5 rounded-xl border-2 border-[#DA2C26] bg-white px-4 py-3 md:px-6 md:py-4 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-[#b52420]">
            {/* Jeb Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src="/Jeb-Blount.png"
                alt="Jeb Blount"
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-3 border-[#DA2C26] shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 text-left">
              <h3 className="text-base md:text-lg font-bold text-gray-900 font-[family-name:var(--font-poppins)]">
                Ask Jeb Blount
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Your AI sales coach — prospecting, objections, pipeline strategy
              </p>
            </div>

            {/* Chat Icon */}
            <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#DA2C26] flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </button>

        {/* ─── Ask Jeb Panel ──────────────────────────────────────────── */}
        <AskJebPanel isOpen={jebOpen} onClose={() => setJebOpen(false)} />

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Leads", value: "500", change: "+12%" },
            { label: "Deals Won", value: "65", change: "+8%" },
            { label: "Win Rate", value: "13%", change: "+2.1pp" },
            { label: "Pipeline Value", value: "£763,000", change: "+18%" },
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
          {/* Prospecting */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Prospecting by Director</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prospecting} layout="vertical" margin={{ top: 20, right: 20, bottom: 5, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="director" type="category" />
                  <Tooltip />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="newLead" name="1 - New Lead" stackId="a" fill="#FBBF24" />
                  <Bar dataKey="attempted" name="2 - Attempted" stackId="a" fill="#FCA5A5" />
                  <Bar dataKey="contacted" name="3 - Contacted" stackId="a" fill="#FB923C" />
                  <Bar dataKey="appointments" name="4 - Appointments" stackId="a" fill="#34D399" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Deal Revenue */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>{`${quarter} Deal Revenue`}</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dealRevenue} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatCurrency} width={80} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline Trend */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Pipeline Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pipelineMonthly} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} width={80} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="deals" name="Deals" stroke="#DC2626" strokeWidth={2} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="value" name="Value" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={conversionFunnel} isAnimationActive>
                    <LabelList position="right" fill="#333" dataKey="stage" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ─── Live Monday.com Charts ─────────────────────────────────── */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 font-[family-name:var(--font-poppins)]">
            Live from Monday.com
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <ProspectingChart />
            <DealRevenueChart />
          </div>
        </div>
      </div>
    </div>
  );
}