import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-accent text-accent-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="text-lg font-semibold tracking-tight">SEM Group</div>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Stock, people, logistics and money for every exhibition.
          </p>
          <p className="mt-4 text-sm opacity-80">
            Warehouses, stalls, challans, contractors and payments in one place, for the office and the site.
          </p>
        </div>
        <p className="text-xs opacity-70">SEM Group · semgroup.in</p>
        {/* Quiet stall-grid motif */}
        <svg aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-[28rem] opacity-[0.12]" viewBox="0 0 200 200">
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 5 }).map((_, c) => (
              <rect key={`${r}-${c}`} x={c * 40 + 4} y={r * 40 + 4} width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
            )),
          )}
        </svg>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-lg font-semibold tracking-tight text-accent lg:hidden">SEM Group</div>
          {children}
        </div>
      </main>
    </div>
  );
}
