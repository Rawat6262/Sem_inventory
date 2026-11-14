import { HardHat } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Contractors · SEM Group", default: "Contractors · SEM Group" } };

export default function ContractorLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="contractor"
      title="Contractors"
      description="Labour contractors, stalls, deal amounts and work payments"
      icon={<HardHat className="size-5" aria-hidden />}
    >
      {children}
    </ModuleShell>
  );
}
