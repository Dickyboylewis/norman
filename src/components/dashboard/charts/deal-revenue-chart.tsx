"use client";

/**
 * Deal Revenue Chart
 * 
 * Bar chart showing deal revenue per director for current quarter
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { director: "Jesus", revenue: 125000 },
  { director: "Joe", revenue: 98000 },
  { director: "Dicky", revenue: 142000 },
];

// Calculate current quarter based on today's date
function getCurrentQuarter(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter}`;
}

export function DealRevenueChart() {
  const quarter = getCurrentQuarter();

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          {quarter} Deal Revenue
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: any) => value ? `$${Number(value).toLocaleString()}` : ''}
              contentStyle={{ 
                backgroundColor: "white", 
                border: "1px solid #e5e7eb",
                borderRadius: "6px"
              }}
            />
            <Bar 
              dataKey="revenue" 
              fill="#dc2626" 
              name="Revenue"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
