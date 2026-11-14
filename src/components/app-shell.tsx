"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Button, cn, Spinner } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import { ApiError, authApi } from "@/lib/api";
import { isRole, modulesFor, ROLE_LABELS, type ModuleDef, type ModuleGroup } from "@/lib/permissions";

const GROUP_ORDER: ModuleGroup[] = ["Operations", "Partners", "Money", "Documents", "People", "Admin"];

export function groupModules(modules: ModuleDef[]) {
  return GROUP_ORDER.map((group) => ({ group, items: modules.filter((m) => m.group === group) })).filter((g) => g.items.length);
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: me, error, isLoading, refetch } = useMe();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const signedOut = error instanceof ApiError && error.status === 401;

  useEffect(() => {
    if (signedOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, router, pathname]);

  // Close the mobile menu after navigating.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await authApi("logout", { method: "POST" });
    } finally {
      queryClient.clear();
      router.replace("/login");
    }
  }

  if (isLoading || signedOut) return <Spinner label="Loading your account" />;

  if (error || !me) {
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col gap-4 px-4">
        <Alert>{error instanceof Error ? error.message : "Could not load your account."}</Alert>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const groups = groupModules(modulesFor(me.role));
  const roleLabel = isRole(me.role) ? ROLE_LABELS[me.role] : me.role;

  const nav = (
    <nav className="flex flex-col gap-6 px-3 py-4" aria-label="Main">
      <NavLink href="/" active={pathname === "/"} icon={<LayoutDashboard className="size-4" />}>
        Dashboard
      </NavLink>
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{group}</p>
          <div className="flex flex-col gap-0.5">
            {items.map((m) => {
              const href = `/modules/${m.key}`;
              return (
                <NavLink key={m.key} href={href} active={pathname === href || pathname.startsWith(`${href}/`)} icon={<m.icon className="size-4" />}>
                  {m.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <p className="px-3 text-sm text-muted">Your role ({roleLabel}) has no modules yet. Ask an admin to check your account.</p>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex print:hidden">
        <div className="flex h-14 items-center border-b border-line px-6 font-semibold tracking-tight text-accent">SEM Group</div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-line px-4">
              <span className="font-semibold tracking-tight text-accent">SEM Group</span>
              <button className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6 print:hidden">
          <button className="-ml-2 rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu className="size-5" />
          </button>
          <span className="font-semibold tracking-tight text-accent lg:hidden">SEM Group</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{me.full_name || me.gmail}</p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent sm:hidden">{roleLabel}</span>
            <Button variant="ghost" onClick={logout} loading={loggingOut} aria-label="Log out" className="px-2.5">
              {!loggingOut && <LogOut className="size-4" />}
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, active, icon, children }: { href: string; active: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-surface-2",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
