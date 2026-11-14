import { ArrowDownToLine } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Incoming challans · SEM Group", default: "Incoming challans · SEM Group" } };

export default function IncomingLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="incoming"
      title="Incoming challans"
      description="Delivery challans for goods coming back"
      icon={<ArrowDownToLine className="size-5" aria-hidden />}
    >
      {children}
    </ModuleShell>
  );
}
