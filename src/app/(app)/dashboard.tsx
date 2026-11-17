"use client";

import { ChevronRight, UserRound } from "lucide-react";
import Link from "next/link";
import { groupModules } from "@/components/app-shell";
import { useMe } from "@/hooks/use-me";
import { missingProfileFields, useMyProfile } from "@/lib/employees";
import { hasProfile, modulesFor } from "@/lib/permissions";

export function Dashboard() {
  const { data: me } = useMe();
  const profile = useMyProfile(Boolean(me && hasProfile(me.role)));
  if (!me) return null;

  const missing = profile.data ? missingProfileFields(profile.data) : [];

  const groups = groupModules(modulesFor(me.role, me.extraModules));
  const firstName = (me.full_name || "").trim().split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">{firstName ? `Hello, ${firstName}` : "Dashboard"}</h1>
      <p className="mt-1 text-sm text-muted">Pick a module to get started.</p>

      {missing.length > 0 && (
        <Link
          href="/profile"
          className="mt-6 flex items-center gap-4 rounded-xl border border-accent/40 bg-accent-soft/40 p-4 transition-colors hover:bg-accent-soft/70"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <UserRound className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Complete your profile</span>
            <span className="mt-0.5 block text-sm text-muted">Still missing: {missing.join(", ")}.</span>
          </span>
          <ChevronRight className="size-4 text-muted" aria-hidden />
        </Link>
      )}

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
