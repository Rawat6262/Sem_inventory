import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { ClientPaymentDetail } from "./client-payment-detail";

export const metadata: Metadata = { title: "Client payment report" };

export default function ReportsClientDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ClientPaymentDetail />
    </Suspense>
  );
}
