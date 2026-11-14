import { ArrowUpFromLine } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Outgoing challans · SEM Group", default: "Outgoing challans · SEM Group" } };

export default function OutgoingLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="outgoing"
      title="Outgoing challans"
      description="Delivery challans for goods going to an exhibition"
      icon={<ArrowUpFromLine className="size-5" aria-hidden />}
    >
      {children}
    </ModuleShell>
  );
}
