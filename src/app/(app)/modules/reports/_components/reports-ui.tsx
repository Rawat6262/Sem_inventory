"use client";

import { ChartColumn } from "lucide-react";
import type { ReactNode } from "react";
import { ModuleShell, type ModuleTab } from "@/components/data-ui";

// Reports pages import the shared pieces from here.
export * from "@/components/data-ui";

const TABS: ModuleTab[] = [
  { href: "/modules/reports", label: "Money", match: (p) => p === "/modules/reports" },
  { href: "/modules/reports/exhibitions", label: "Exhibitions", match: (p) => p.startsWith("/modules/reports/exhibitions") },
  { href: "/modules/reports/stock", label: "Stock", match: (p) => p.startsWith("/modules/reports/stock") },
  { href: "/modules/reports/clients", label: "Clients", match: (p) => p.startsWith("/modules/reports/clients") },
];

export function ReportsShell({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="reports"
      title="Reports"
      description="Summaries for projects, exhibitions, warehouses, clients and more"
      icon={<ChartColumn className="size-5" aria-hidden />}
      tabs={TABS}
    >
      {children}
    </ModuleShell>
  );
}
