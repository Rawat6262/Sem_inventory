import { Tent } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Exhibitions · SEM Group", default: "Exhibitions · SEM Group" } };

export default function ExhibitionsLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell
      module="exhibitions"
      title="Exhibitions"
      description="Exhibitions, stalls, designs and linked clients"
      icon={<Tent className="size-5" aria-hidden />}
    >
      {children}
    </ModuleShell>
  );
}
