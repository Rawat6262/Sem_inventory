"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { groupModules } from "@/components/app-shell";
import { useMe } from "@/hooks/use-me";
import { modulesFor } from "@/lib/permissions";

export function Dashboard() {
  const { data: me } = useMe();
  if (!me) return null;

  const groups = groupModules(modulesFor(me.role));
  const firstName = (me.full_name || "").trim().split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">{firstName ? `Hello, ${firstName}` : "Dashboard"}</h1>
      <p className="mt-1 text-sm text-muted">Pick a module to get started.</p>

      <div className="mt-8 flex flex-col gap-8">
        {groups.map(({ group, items }) => (
          <section key={group} aria-labelledby={`group-${group}`}>
            <h2 id={`group-${group}`} className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
              {group}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((m) => (
                <Link
                  key={m.key}
                  href={`/modules/${m.key}`}
                  className="group flex items-start gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-accent-soft/40"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <m.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 font-medium">
                      {m.label}
                      <ChevronRight className="size-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{m.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
