"use client";

/**
 * Cashflow Balance Card
 * 
 * Displays current cashflow balance as a large metric
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export function CashflowBalance() {
  // Mock data - replace with real data from your API
  const balance = 487650;

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Cashflow Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-5xl font-bold text-gray-900 mb-2">
            ${balance.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">
            Current available balance
          </p>
          <div className="mt-8 w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Incoming</span>
              <span className="font-semibold text-green-600">+$125,000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Outgoing</span>
              <span className="font-semibold text-red-600">-$78,500</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
