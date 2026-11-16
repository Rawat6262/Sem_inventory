import type { Metadata } from "next";
import { ClientsReportView } from "./clients-view";

export const metadata: Metadata = { title: "Clients" };

export default function ReportsClientsPage() {
  return <ClientsReportView />;
}
