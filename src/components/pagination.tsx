"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui";

const PAGE_SIZE = 20;

/**
 * Shows a list a page at a time: `children` gets the rows of the current page,
 * and the page bar appears under them when there's more than one page.
 * `resetKey` is the search and filters, so changing them goes back to page 1.
 */
export function Paged<T>({
  items,
  resetKey = "",
  size = PAGE_SIZE,
  children,
}: {
  items: readonly T[];
  resetKey?: string;
  size?: number;
  children: (rows: T[]) => ReactNode;
}) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const top = useRef<HTMLDivElement>(null);

  // Set while rendering (not in an effect) so the old page never flashes up.
  if (state.key !== resetKey) setState({ key: resetKey, page: 1 });

  const total = Math.max(1, Math.ceil(items.length / size));
  // Also when rows were deleted and the last page is gone.
  const page = state.key === resetKey ? Math.min(state.page, total) : 1;

  function go(next: number) {
    setState({ key: resetKey, page: next });
    // Start reading the new page from its top.
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  }

  return (
    <div ref={top} className="scroll-mt-20">
      {children(items.slice((page - 1) * size, page * size))}
      <Pagination page={page} total={total} onPage={go} />
    </div>
  );
}

/** The page bar. Nothing is drawn when there's only one page. */
export function Pagination({ page, total, onPage, className }: { page: number; total: number; onPage: (page: number) => void; className?: string }) {
  if (total <= 1) return null;
  const first = page <= 1;
  const last = page >= total;

  return (
    <div className={cn("mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 print:hidden", className)}>
      <nav aria-label="Pages" className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
        <Arrow label="First page" disabled={first} onClick={() => onPage(1)} className="max-sm:hidden">
          <ChevronsLeft className="size-4" aria-hidden />
        </Arrow>
        <Arrow label="Previous page" disabled={first} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="size-4" aria-hidden />
        </Arrow>

        {pageNumbers(page, total).map((n, i) =>
          n === null ? (
            <span key={`gap-${i}`} className="w-5 text-center text-sm text-muted" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-label={`Page ${n}`}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "h-8 min-w-8 rounded-lg px-1.5 text-sm font-medium tabular-nums transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                n === page ? "bg-accent text-accent-ink" : "text-ink hover:bg-surface-2",
                // Phones only have room for the first, current and last page.
                n !== page && n !== 1 && n !== total && "max-sm:hidden",
              )}
            >
              {n}
            </button>
          ),
        )}

        <Arrow label="Next page" disabled={last} onClick={() => onPage(page + 1)}>
          <ChevronRight className="size-4" aria-hidden />
        </Arrow>
        <Arrow label="Last page" disabled={last} onClick={() => onPage(total)} className="max-sm:hidden">
          <ChevronsRight className="size-4" aria-hidden />
        </Arrow>
      </nav>

      {/* A new box for each page, so it always starts at the current one. */}
      <GoTo key={page} page={page} total={total} onPage={onPage} />
    </div>
  );
}

function Arrow({ label, disabled, onClick, className, children }: { label: string; disabled: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

function GoTo({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  const [text, setText] = useState(String(page));

  function commit() {
    const n = Math.min(Math.max(Number(text) || page, 1), total);
    setText(String(n));
    if (n !== page) onPage(n);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit();
      }}
      className="flex items-center gap-2 text-sm text-muted"
    >
      <label className="flex items-center gap-2">
        Go to
        <input
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          inputMode="numeric"
          aria-label={`Go to page, 1 to ${total}`}
          className="h-9 w-16 rounded-lg border border-line bg-surface text-center text-sm font-medium text-ink tabular-nums focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none"
        />
      </label>
      of {total}
    </form>
  );
}

/** Page numbers to show, with null for a gap: 1 2 3 4 5 … 84, or 1 … 41 42 43 … 84. */
function pageNumbers(page: number, total: number): (number | null)[] {
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  if (total <= 7) return range(1, total);
  if (page <= 4) return [...range(1, 5), null, total];
  if (page >= total - 3) return [1, null, ...range(total - 4, total)];
  return [1, null, ...range(page - 1, page + 1), null, total];
}
