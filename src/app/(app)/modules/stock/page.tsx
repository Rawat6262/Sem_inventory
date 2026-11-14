import type { Metadata } from "next";
import { WarehousesView } from "./warehouses-view";

export const metadata: Metadata = { title: "Warehouses" };

export default function StockPage() {
  return <WarehousesView />;
}
