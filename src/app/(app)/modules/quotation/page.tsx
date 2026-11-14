import type { Metadata } from "next";
import { QuotationsView } from "./quotations-view";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotationsPage() {
  return <QuotationsView />;
}
