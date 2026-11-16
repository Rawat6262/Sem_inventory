import type { Metadata } from "next";
import { MoneyView } from "./money-view";

export const metadata: Metadata = { title: "Money" };

export default function ReportsMoneyPage() {
  return <MoneyView />;
}
