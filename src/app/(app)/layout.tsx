import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Spinner } from "@/components/ui";

// AppShell reads the URL (usePathname), which isn't known when prerendering
// dynamic routes like /modules/stock/warehouses/[id], so it streams in.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Spinner label="Loading your account" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
