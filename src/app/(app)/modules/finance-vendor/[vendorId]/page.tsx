import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { FinanceVendorDetail } from "./finance-vendor-detail";

export const metadata: Metadata = { title: "Vendor ledger" };

// The vendor id is read on the client (useParams) inside Suspense, so the
// page shell can be prerendered for any id.
export default function FinanceVendorPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <FinanceVendorDetail />
    </Suspense>
  );
}
