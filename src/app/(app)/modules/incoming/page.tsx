import type { Metadata } from "next";
import { IncomingView } from "./incoming-view";

export const metadata: Metadata = { title: "Incoming challans" };

export default function IncomingPage() {
  return <IncomingView />;
}
