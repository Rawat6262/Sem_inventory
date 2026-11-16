import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ReportsShell } from "./_components/reports-ui";

export const metadata: Metadata = { title: { template: "%s · Reports · SEM Group", default: "Reports · SEM Group" } };

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <ReportsShell>{children}</ReportsShell>;
}
