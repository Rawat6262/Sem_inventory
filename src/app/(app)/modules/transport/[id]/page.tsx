import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { TransportDetail } from "./transport-detail";

export const metadata: Metadata = { title: "Transporter" };

// The transporter id is read on the client (useParams) inside Suspense, so
// the page shell can be prerendered for any id.
export default function TransportDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TransportDetail />
    </Suspense>
  );
}
