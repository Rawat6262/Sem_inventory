import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { ManpowerDetail } from "./manpower-detail";

export const metadata: Metadata = { title: "Worker" };

// The person id is read on the client (useParams) inside Suspense, so the
// page shell can be prerendered for any id.
export default function ManpowerPersonPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ManpowerDetail />
    </Suspense>
  );
}
