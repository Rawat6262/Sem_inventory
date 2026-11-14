"use client";

import { Construction, Lock } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMe } from "@/hooks/use-me";
import { canOpen, findModule } from "@/lib/permissions";

// Stand-in until each module's screens are built in later phases.
export function ModulePlaceholder({ moduleKey }: { moduleKey: string }) {
  const { data: me } = useMe();
  const mod = findModule(moduleKey);
  if (!me || !mod) return null;

  if (!canOpen(me.role, mod.key)) {
    return (
      <EmptyState icon={<Lock className="size-6" />} title="You don't have access to this module">
        Your role can&apos;t open {mod.label}. Ask an admin if you need it.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <mod.icon className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{mod.label}</h1>
          <p className="text-sm text-muted">{mod.description}</p>
        </div>
      </div>
      <div className="mt-8">
        <EmptyState icon={<Construction className="size-6" />} title="Coming in a later phase">
          The {mod.label.toLowerCase()} screens haven&apos;t been built yet.
        </EmptyState>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="text-muted">{icon}</span>
      <h2 className="mt-3 font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted">{children}</p>
      <Link href="/" className="mt-6 text-sm font-medium text-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
