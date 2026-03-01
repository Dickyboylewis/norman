"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// mock data for demonstration (values in GBP)
const data = [
  { month: "Jan", full: 180000, seventyFive: 135000 },
  { month: "Feb", full: 210000, seventyFive: 157500 },
  { month: "Mar", full: 195000, seventyFive: 146250 },
  { month: "Apr", full: 240000, seventyFive: 180000 },
  { month: "May", full: 225000, seventyFive: 168750 },
  { month: "Jun", full: 270000, seventyFive: 202500 },
];

const TARGET_REVENUE = 250000;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);

export function IncomePlannerChart() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Income Planner</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={formatCurrency} width={80} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <ReferenceLine
              y={TARGET_REVENUE}
              stroke="#333"
              strokeDasharray="5 5"
              label={{
                value: `Target: ${formatCurrency(TARGET_REVENUE)}`,
                position: "right",
                fill: "#333",
                fontSize: 12,
              }}
            />
            <Bar dataKey="full" name="100% Income" fill="#DC2626" />
            <Bar dataKey="seventyFive" name="75% Income" fill="#2563EB" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
