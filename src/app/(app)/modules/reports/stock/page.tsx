import type { Metadata } from "next";
import { StockOverviewView } from "./stock-overview-view";

export const metadata: Metadata = { title: "Stock" };

export default function ReportsStockPage() {
  return <StockOverviewView />;
}
