import type { Metadata } from "next";
import { Suspense } from "react";
import { ChallanPrint } from "@/components/challans/challan-sheet";
import { sheetFonts } from "../../fonts";

export const metadata: Metadata = { title: "Incoming challan" };

// Outside the (app) group on purpose: no sidebar or header, just the sheet.
export default function IncomingChallanPrintPage() {
  return (
    <div className={sheetFonts}>
      <Suspense>
        <ChallanPrint dir="incoming" />
      </Suspense>
    </div>
  );
}
