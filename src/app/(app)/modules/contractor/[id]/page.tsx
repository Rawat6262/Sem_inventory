import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { ContractorDetail } from "./contractor-detail";

export const metadata: Metadata = { title: "Contractor" };

// The contractor id is read on the client (useParams) inside Suspense, so the
// page shell can be prerendered for any id.
export default function ContractorPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ContractorDetail />
    </Suspense>
  );
}
