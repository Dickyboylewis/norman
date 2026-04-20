"use client";

import { CRMNeuralMap } from "@/components/dashboard/widgets/crm-neural-map";
import { TopBar } from "@/components/dashboard/topbar";

export default function NetworkPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Relationship Map" />
      <div className="flex-1">
        <CRMNeuralMap />
      </div>
    </div>
  );
}
