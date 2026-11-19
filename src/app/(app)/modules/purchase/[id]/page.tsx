import type { Metadata } from "next";
import { PurchaseDetail } from "./purchase-detail";

export const metadata: Metadata = { title: "Purchase" };

export default function PurchaseDetailPage() {
  return <PurchaseDetail />;
}
