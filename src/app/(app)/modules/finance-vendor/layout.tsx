import { Landmark } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Finance vendors · SEM Group", default: "Finance vendors · SEM Group" } };

export default function FinanceVendorLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell module="finance-vendor" title="Finance vendors" description="Vendor ledger and payments" icon={<Landmark className="size-5" aria-hidden />}>
      {children}
    </ModuleShell>
  );
}
