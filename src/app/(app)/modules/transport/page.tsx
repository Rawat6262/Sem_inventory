import type { Metadata } from "next";
import { TransportView } from "./transport-view";

export const metadata: Metadata = { title: "Transport" };

export default function TransportPage() {
  return <TransportView />;
}
