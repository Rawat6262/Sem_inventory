import type { Metadata } from "next";
import { FinanceVendorsView } from "./finance-vendors-view";

export const metadata: Metadata = { title: "Finance vendors" };

export default function FinanceVendorsPage() {
  return <FinanceVendorsView />;
}
