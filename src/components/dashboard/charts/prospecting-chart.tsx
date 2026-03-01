"use client";

/**
 * Prospecting Chart
 * 
 * Stacked bar chart showing lead statuses per director
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { 
    director: "Jesus", 
    newLeads: 12, 
    attempted: 8, 
    contacted: 15, 
    appointments: 5 
  },
  { 
    director: "Joe", 
    newLeads: 18, 
    attempted: 12, 
    contacted: 10, 
    appointments: 7 
  },
  { 
    director: "Dicky", 
    newLeads: 15, 
    attempted: 10, 
    contacted: 12, 
    appointments: 6 
  },
];

export function ProspectingChart() {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Prospecting
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="director" 
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "white", 
                border: "1px solid #e5e7eb",
                borderRadius: "6px"
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="rect"
            />
            <Bar 
              dataKey="newLeads" 
              stackId="a" 
              fill="#fbbf24" 
              name="1 - New Leads"
            />
            <Bar 
              dataKey="attempted" 
              stackId="a" 
              fill="#fbcfe8" 
              name="2 - Attempted to Contact"
            />
            <Bar 
              dataKey="contacted" 
              stackId="a" 
              fill="#fb923c" 
              name="3 - Contacted / Followed Up"
            />
            <Bar 
              dataKey="appointments" 
              stackId="a" 
              fill="#22c55e" 
              name="4 - Appointments"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
