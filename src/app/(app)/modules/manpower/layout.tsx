import { Users } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Manpower · SEM Group", default: "Manpower · SEM Group" } };

export default function ManpowerLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell module="manpower" title="Manpower" description="Sub-labour workers" icon={<Users className="size-5" aria-hidden />}>
      {children}
    </ModuleShell>
  );
}
