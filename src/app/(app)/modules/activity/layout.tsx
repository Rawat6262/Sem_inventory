import { History } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Activity · SEM Group", default: "Activity · SEM Group" } };

export default function ActivityLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell module="activity" title="Activity" description="Audit log of who did what" icon={<History className="size-5" aria-hidden />}>
      {children}
    </ModuleShell>
  );
}
