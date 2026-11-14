import { Truck } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Transport · SEM Group", default: "Transport · SEM Group" } };

export default function TransportLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell module="transport" title="Transport" description="Transporters, transport letters, trips and payments" icon={<Truck className="size-5" aria-hidden />}>
      {children}
    </ModuleShell>
  );
}
