"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ReferenceLine, ResponsiveContainer, LabelList
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AppointmentsLabel(props: any) {
  const { x, y, width, value } = props;
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fill="#16a34a"
      fontSize={13}
      fontWeight={700}
    >
      {value ?? 0}
    </text>
  );
}

export function ProspectingChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/monday") 
      .then((res) => res.json())
      .then((jsonData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load chart data", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card className="w-full h-[500px] flex items-center justify-center">
        <div className="text-gray-400 font-poppins animate-pulse">Loading Live Monday Data...</div>
      </Card>
    );
  }

  return (
    <Card className="w-full h-[500px] flex flex-col font-roboto">
      <CardHeader className="pb-2">
        <div className="flex flex-col items-center">
          <CardTitle className="text-xl font-bold text-gray-800 text-center">This Weeks Prospecting</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Live</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="h-[400px] pb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            barSize={60}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 14 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af' }} />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />

            {/* Target Lines */}
            <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Record Week', fill: '#ef4444', fontSize: 12, dx: -200 }} />
            <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'Total Prospecting Minimum Aim', fill: '#f59e0b', fontSize: 12, dx: -150 }} />
            <ReferenceLine y={5} stroke="#22c55e" strokeDasharray="3 3" label={{ position: 'top', value: 'Ideal Appointments per week', fill: '#22c55e', fontSize: 12, dx: -160 }} />

            {/* The Stacked Bars - Exactly matching the backend names! */}
            <Bar dataKey="New Lead" stackId="a" fill="#FBBF24" radius={[0, 0, 4, 4]} />
            <Bar dataKey="Attempted to Contact" stackId="a" fill="#FBCFE8" />
            <Bar dataKey="Needs Follow up" stackId="a" fill="#F97316" />
            <Bar dataKey="Appointments" stackId="a" fill="#34D399" radius={[4, 4, 0, 0]}>
              <LabelList content={<AppointmentsLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}