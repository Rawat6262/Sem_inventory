import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { VendorDetail } from "./vendor-detail";

export const metadata: Metadata = { title: "Vendor" };

// The vendor id is read on the client (useParams) inside Suspense, so the
// page shell can be prerendered for any id.
export default function VendorPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VendorDetail />
    </Suspense>
  );
}
