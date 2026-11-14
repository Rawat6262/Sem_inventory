import { Contact } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Employees · SEM Group", default: "Employees · SEM Group" } };

export default function EmployeesLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell module="employees" title="Employees" description="Employees, leave, sales targets and increments" icon={<Contact className="size-5" aria-hidden />}>
      {children}
    </ModuleShell>
  );
}
