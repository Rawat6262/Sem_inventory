import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findModule, MODULES } from "@/lib/permissions";
import { ModulePlaceholder } from "./module-placeholder";

// Modules that have their own route folder (e.g. /modules/stock) are left out.
const BUILT = new Set(["stock", "contractor", "supervisor", "manpower", "vendor", "finance-vendor", "transport", "transaction", "outgoing", "incoming", "quotation", "employees", "reports", "activity"]);

export function generateStaticParams() {
  return MODULES.filter((m) => !BUILT.has(m.key)).map((m) => ({ module: m.key }));
}

export async function generateMetadata({ params }: PageProps<"/modules/[module]">): Promise<Metadata> {
  const { module } = await params;
  return { title: findModule(module)?.label ?? "Not found" };
}

export default async function ModulePage({ params }: PageProps<"/modules/[module]">) {
  const { module } = await params;
  if (!findModule(module)) notFound();
  return <ModulePlaceholder moduleKey={module} />;
}
