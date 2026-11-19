import type { Metadata } from "next";
import { Suspense } from "react";
import { ChallanPrint } from "@/components/challans/challan-sheet";
import { sheetFonts } from "../../fonts";

export const metadata: Metadata = { title: "Outgoing challan" };

// Outside the (app) group on purpose: no sidebar or header, just the sheet.
export default function OutgoingChallanPrintPage() {
  return (
    <div className={sheetFonts}>
      <Suspense>
        <ChallanPrint dir="outgoing" />
      </Suspense>
    </div>
  );
}
