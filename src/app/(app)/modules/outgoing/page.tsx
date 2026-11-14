import type { Metadata } from "next";
import { OutgoingView } from "./outgoing-view";

export const metadata: Metadata = { title: "Outgoing challans" };

export default function OutgoingPage() {
  return <OutgoingView />;
}
