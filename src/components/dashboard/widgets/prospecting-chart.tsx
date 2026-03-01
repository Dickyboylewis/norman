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
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    director: "Jesus",
    newLead: 40,
    attempted: 30,
    contacted: 50,
    appointments: 20,
  },
  {
    director: "Joe",
    newLead: 25,
    attempted: 20,
    contacted: 35,
    appointments: 15,
  },
  {
    director: "Dicky",
    newLead: 50,
    attempted: 40,
    contacted: 60,
    appointments: 30,
  },
];

export function ProspectingChart() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Prospecting</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 20, bottom: 5, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="director" type="category" />
            <Tooltip />
            <Legend verticalAlign="top" />
            <Bar dataKey="newLead" name="1 - New Lead" stackId="a" fill="#FBBF24" />
            <Bar dataKey="attempted" name="2 - Attempted to Contact" stackId="a" fill="#FCA5A5" />
            <Bar dataKey="contacted" name="3 - Contacted / Followed Up" stackId="a" fill="#FB923C" />
            <Bar dataKey="appointments" name="4 - Appointments" stackId="a" fill="#34D399" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
