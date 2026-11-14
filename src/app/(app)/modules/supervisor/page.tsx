import type { Metadata } from "next";
import { SupervisorsView } from "./supervisors-view";

export const metadata: Metadata = { title: "Supervisors" };

export default function SupervisorsPage() {
  return <SupervisorsView />;
}
