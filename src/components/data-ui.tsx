"use client";

// Building blocks shared by the module screens (stock, contractors, ...):
// the module header with tabs and role check, stat tiles, tables, search,
// loading/error states.

import { Lock, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Alert, Button, cn, Input, Spinner } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";
import { canOpen, type ModuleKey } from "@/lib/permissions";

export type ModuleTab = { href: string; label: string; match: (pathname: string) => boolean };

type ShellProps = {
  module: ModuleKey;
  title: string;
  description: string;
  // A rendered icon element (e.g. <Boxes className="size-5" />), not the
  // component itself — a bare component reference can't cross from a server
  // layout into this client component (it isn't serializable).
  icon: ReactNode;
  tabs?: ModuleTab[];
  children: ReactNode;
};

/** Header, tabs and the role check for a module's pages. */
export function ModuleShell({ module, title, description, icon, tabs, children }: ShellProps) {
  const pathname = usePathname();
  const { data: me } = useMe();
  if (!me) return null;

  if (!canOpen(me.role, module)) {
    return (
      <EmptyState icon={<Lock className="size-6" />} title={`You don't have access to ${title.toLowerCase()}`}>
        Ask an admin if you need it.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>

      {tabs && (
        <nav aria-label={`${title} sections`} className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max gap-1 border-b border-line">
            {tabs.map((tab) => {
              const active = tab.match(pathname);
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "-mb-px block border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="mt-6">{children}</div>
    </div>
  );
}

export function StatTile({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: "warn" | "danger" | "accent" | "success"; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "warn" && "text-warn",
          tone === "danger" && "text-danger",
          tone === "accent" && "text-accent",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="text-muted">{icon}</span>
      <h2 className="mt-3 font-medium">{title}</h2>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Loading, error and retry for a page's main queries. */
export function QueryState({ queries, children }: { queries: { isPending: boolean; error: unknown; refetch: () => unknown }[]; children: () => ReactNode }) {
  const failed = queries.find((q) => q.error);
  if (failed) {
    const err = failed.error;
    return (
      <div className="flex max-w-md flex-col gap-3">
        <Alert>{err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong."}</Alert>
        <div>
          <Button variant="secondary" onClick={() => queries.forEach((q) => q.refetch())}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (queries.some((q) => q.isPending)) return <Spinner />;
  return <>{children()}</>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
    </div>
  );
}

/** Small coloured number used in tables; greyed out when zero. */
export function Count({ n, tone, money }: { n: number; tone?: "warn" | "danger" | "accent" | "success"; money?: boolean }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        n === 0 && "text-muted/60",
        n > 0 && tone === "warn" && "font-medium text-warn",
        n > 0 && tone === "danger" && "font-medium text-danger",
        n > 0 && tone === "accent" && "font-medium text-accent",
        n > 0 && tone === "success" && "font-medium text-success",
      )}
    >
      {money ? fmtMoney(n) : new Intl.NumberFormat("en-IN").format(n)}
    </span>
  );
}

const moneyFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const fmtMoney = (n: number | null | undefined) => moneyFormat.format(n ?? 0);

export function Section({ title, description, action, children }: { title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Scrolls sideways on small screens instead of squeezing columns. */
export function TableWrap({ children }: { children: ReactNode }) {
  // `relative` keeps absolutely positioned bits (like sr-only labels) inside
  // the scroll box; otherwise they widen the whole page on phones.
  return <div className="relative overflow-x-auto rounded-xl border border-line bg-surface">{children}</div>;
}

export const th = "px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted";
export const td = "px-3 py-2.5 whitespace-nowrap";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-accent hover:underline">
      {children}
    </Link>
  );
}

/** Dashed box for "nothing here yet" inside a section. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">{children}</p>;
}
