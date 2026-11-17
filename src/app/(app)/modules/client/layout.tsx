import { Handshake } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Clients · SEM Group", default: "Clients · SEM Group" } };

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="client"
      title="Clients"
      description="Client details, stall deals and payment tracking"
      icon={<Handshake className="size-5" aria-hidden />}
    >
      {children}
    </ModuleShell>
  );
}
