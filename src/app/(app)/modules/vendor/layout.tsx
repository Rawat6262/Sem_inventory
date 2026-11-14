import { Store } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ModuleShell } from "@/components/data-ui";

export const metadata: Metadata = { title: { template: "%s · Vendors · SEM Group", default: "Vendors · SEM Group" } };

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleShell module="vendor" title="Vendors" description="Vendor list and details" icon={<Store className="size-5" aria-hidden />}>
      {children}
    </ModuleShell>
  );
}
