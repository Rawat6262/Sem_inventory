import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { ExhibitionSummaryDetail } from "./exhibition-summary-detail";

export const metadata: Metadata = { title: "Exhibition summary" };

export default function ReportsExhibitionDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ExhibitionSummaryDetail />
    </Suspense>
  );
}
