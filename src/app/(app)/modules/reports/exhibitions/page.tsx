import type { Metadata } from "next";
import { ExhibitionsReportView } from "./exhibitions-view";

export const metadata: Metadata = { title: "Exhibitions" };

export default function ReportsExhibitionsPage() {
  return <ExhibitionsReportView />;
}
