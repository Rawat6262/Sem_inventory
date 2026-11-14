import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { EmployeeDetail } from "./employee-detail";

export const metadata: Metadata = { title: "Employee" };

// The employee id is read on the client (useParams) inside Suspense, so the
// page shell can be prerendered for any id.
export default function EmployeeDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EmployeeDetail />
    </Suspense>
  );
}
