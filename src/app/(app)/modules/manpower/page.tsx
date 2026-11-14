import type { Metadata } from "next";
import { ManpowerView } from "./manpower-view";

export const metadata: Metadata = { title: "Manpower" };

export default function ManpowerPage() {
  return <ManpowerView />;
}
