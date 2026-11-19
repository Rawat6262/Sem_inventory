import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Purchases · SEM Group", default: "Purchases · SEM Group" } };

export default function PurchaseLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell module="purchase" title="Purchases" description="What was bought, from whom, and receiving it into stock" icon={<ShoppingCart className="size-5" aria-hidden />}>
      {children}
    </ModuleShell>
  );
}
