import { UserCheck } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Supervisors · SEM Group", default: "Supervisors · SEM Group" } };

export default function SupervisorLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="supervisor"
      title="Supervisors"
      description="Supervisors, their exhibitions and transactions"
      icon={<UserCheck className="size-5" aria-hidden />}
    >
      {children}
    </ModuleShell>
  );
}
