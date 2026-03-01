"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CashflowCard() {
  // mock balance
  const balance = "£248,350";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Cashflow Balance</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-48">
        <span className="text-4xl font-bold text-[#333]">{balance}</span>
      </CardContent>
    </Card>
  );
}
