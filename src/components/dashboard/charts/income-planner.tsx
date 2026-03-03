"use client";

/**
 * Income Planner Chart -> Cash In and Out
 * * Bar chart showing Cash In vs Cash Out per month (Mimicking Xero Dashboard)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// 1. Updated data to match the Xero Cash In/Out screenshot
const data = [
  { month: "Oct", cashIn: 280000, cashOut: 220000 },
  { month: "Nov", cashIn: 300000, cashOut: 350000 },
  { month: "Dec", cashIn: 500000, cashOut: 210000 },
  { month: "Jan", cashIn: 320000, cashOut: 180000 },
  { month: "Feb", cashIn: 50000, cashOut: 150000 },
  { month: "Mar", cashIn: 0, cashOut: 40000 },
];

export function IncomePlannerChart() {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Cash in and out • Last 6 months
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }} 
              dy={10}
            />
            
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              /* FIX: Added ': any' to stop TypeScript from complaining */
              tickFormatter={(value: any) => `£${value / 1000}k`} 
            />
            
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
              contentStyle={{ 
                backgroundColor: "white", 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
              }}
              /* FIX: Added ': any' here too just to be safe */
              formatter={(value: any) => [`£${Number(value).toLocaleString()}`, undefined]}
            />
            
            <Legend 
              iconType="circle" 
              wrapperStyle={{ paddingTop: '20px' }} 
            />
            
            <Bar 
              dataKey="cashIn" 
              name="Cash in" 
              fill="#2563eb" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="cashOut" 
              name="Cash out" 
              fill="#93c5fd" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}