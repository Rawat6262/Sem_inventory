import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StockShell } from "./_components/stock-ui";

export const metadata: Metadata = { title: { template: "%s · Stock · SEM Group", default: "Stock · SEM Group" } };

export default function StockLayout({ children }: { children: ReactNode }) {
  return <StockShell>{children}</StockShell>;
}
