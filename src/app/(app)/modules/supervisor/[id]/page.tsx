import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { SupervisorDetail } from "./supervisor-detail";

export const metadata: Metadata = { title: "Supervisor" };

// The supervisor id is read on the client (useParams) inside Suspense, so the
// page shell can be prerendered for any id.
export default function SupervisorPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SupervisorDetail />
    </Suspense>
  );
}
