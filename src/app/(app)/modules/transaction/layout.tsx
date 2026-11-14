import { ArrowLeftRight } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Transactions · SEM Group", default: "Transactions · SEM Group" } };

export default function TransactionLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="transaction"
      title="Transactions"
      description="Payments to labour, supervisors, vendors and transporters"
      icon={<ArrowLeftRight className="size-5" aria-hidden />}
    >
      {children}
    </ModuleShell>
  );
}
