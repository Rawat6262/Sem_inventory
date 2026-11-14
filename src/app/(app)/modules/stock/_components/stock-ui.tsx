"use client";

import { Boxes } from "lucide-react";
import type { ReactNode } from "react";
import { ModuleShell, type ModuleTab } from "@/components/data-ui";

// Stock pages import the shared pieces from here.
export * from "@/components/data-ui";

const TABS: ModuleTab[] = [
  { href: "/modules/stock", label: "Warehouses", match: (p) => p === "/modules/stock" || p.startsWith("/modules/stock/warehouses") },
  { href: "/modules/stock/products", label: "Products", match: (p) => p.startsWith("/modules/stock/products") },
  { href: "/modules/stock/transfers", label: "Transfers", match: (p) => p.startsWith("/modules/stock/transfers") },
  { href: "/modules/stock/categories", label: "Categories", match: (p) => p.startsWith("/modules/stock/categories") },
];

export function StockShell({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="stock"
      title="Stock"
      description="Warehouses, products, categories and stock transfers"
      icon={<Boxes className="size-5" aria-hidden />}
      tabs={TABS}
    >
      {children}
    </ModuleShell>
  );
}
