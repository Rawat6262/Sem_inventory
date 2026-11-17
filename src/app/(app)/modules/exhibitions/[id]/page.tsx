import type { Metadata } from "next";
import { ExhibitionDetail } from "./exhibition-detail";

export const metadata: Metadata = { title: "Exhibition" };

export default function ExhibitionDetailPage() {
  return <ExhibitionDetail />;
}
