"use client";

/**
 * Income Planner Chart
 * 
 * Bar chart showing 100% Income vs 75% Income per month
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", fullIncome: 45000, reducedIncome: 33750 },
  { month: "Feb", fullIncome: 52000, reducedIncome: 39000 },
  { month: "Mar", fullIncome: 48000, reducedIncome: 36000 },
  { month: "Apr", fullIncome: 61000, reducedIncome: 45750 },
  { month: "May", fullIncome: 55000, reducedIncome: 41250 },
  { month: "Jun", fullIncome: 67000, reducedIncome: 50250 },
];

export function IncomePlannerChart() {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Income per month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number | undefined) => value ? `$${value.toLocaleString()}` : ''}
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
              dataKey="fullIncome" 
              fill="#dc2626" 
              name="100% Income"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="reducedIncome" 
              fill="#3b82f6" 
              name="75% Income"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
