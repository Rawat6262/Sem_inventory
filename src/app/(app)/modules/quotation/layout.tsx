import { FileText } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Quotations · SEM Group", default: "Quotations · SEM Group" } };

export default function QuotationLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell module="quotation" title="Quotations" description="Create quotations and export them as PDF" icon={<FileText className="size-5" aria-hidden />}>
      {children}
    </ModuleShell>
  );
}
