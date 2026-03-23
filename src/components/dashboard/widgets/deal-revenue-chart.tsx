"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// simple mock revenue data per director
const data = [
  { name: "Jesus", revenue: 120000 },
  { name: "Joe", revenue: 95000 },
  { name: "Dicky", revenue: 110000 },
];

function getCurrentQuarter(): string {
  const month = new Date().getMonth();
  return `Q${Math.floor(month / 3) + 1}`;
}

export function DealRevenueChart() {
  const quarter = getCurrentQuarter();

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{`${quarter} Deal Revenue`}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
