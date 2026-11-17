import type { Metadata } from "next";
import { ExhibitionsView } from "./exhibitions-view";

export const metadata: Metadata = { title: "Exhibitions" };

export default function ExhibitionsPage() {
  return <ExhibitionsView />;
}
