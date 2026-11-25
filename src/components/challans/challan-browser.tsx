"use client";

// Shared browsing UI for outgoing/incoming challans: there's no "list
// everything" endpoint on the backend, only a monthly summary (drill into
// one month for its challans) and a keyword search. Used by both the
// Outgoing and Incoming challans modules.

import { ArrowLeft, Printer, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { EmptyNote, QueryState, Section, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { Paged } from "@/components/pagination";
import {
  fmt,
  fmtDate,
  challanPrintHref,
  useMonthDetail,
  useMonthlySummary,
  useSearchChallans,
  type Challan,
  type MonthRow,
} from "@/lib/challans";

type Direction = "outgoing" | "incoming";

export function ChallanBrowser({ dir }: { dir: Direction }) {
  const monthly = useMonthlySummary(dir);
  const [open, setOpen] = useState<{ year: number; month: number } | null>(null);
  const detail = useMonthDetail(dir, open?.year ?? null, open?.month ?? null);
  const search = useSearchChallans(dir);
  const [keyword, setKeyword] = useState("");

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (keyword.trim()) search.mutate(keyword.trim());
  }

  return (
    <>
      <form onSubmit={runSearch} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by document number, exhibition, vehicle, item…"
            aria-label="Search challans"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" loading={search.isPending} disabled={!keyword.trim()}>
          Search
        </Button>
        {search.data && (
          <Button type="button" variant="ghost" onClick={() => search.reset()}>
            Clear
          </Button>
        )}
      </form>

      {search.isPending ? null : search.data ? (
        <SearchResults dir={dir} keyword={keyword} challans={search.data.data} />
      ) : open ? (
        <MonthView dir={dir} detail={detail} onBack={() => setOpen(null)} />
      ) : (
        <QueryState queries={[monthly]}>
          {() => (
            <MonthGrid
              dir={dir}
              rows={monthly.data ?? []}
              onOpen={(y, m) => setOpen({ year: y, month: m })}
            />
          )}
        </QueryState>
      )}
    </>
  );
}

function MonthGrid({ dir, rows, onOpen }: { dir: Direction; rows: MonthRow[]; onOpen: (year: number, month: number) => void }) {
  if (rows.length === 0) {
    return <EmptyNote>No challans have been created yet. Add one to get started.</EmptyNote>;
  }
  const sorted = [...rows].sort((a, b) => b.year - a.year || b.month - a.month);
  return (
    <Paged items={sorted} size={12}>
      {(pageRows) => (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pageRows.map((r) => (
            <li key={`${r.year}-${r.month}`}>
              <button
                type="button"
                onClick={() => onOpen(r.year, r.month)}
                className="w-full rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent-soft/40"
              >
                <div className="font-medium">
                  {r.month_name} {r.year}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted">
                  <div>
                    {fmt(r.total_challans)} challan{r.total_challans === 1 ? "" : "s"}
                  </div>
                  <div>{fmt(r.total_quantity)} units sent</div>
                  {dir === "incoming" ? (
                    <>
                      <div>{fmt(r.total_received)} returned</div>
                      <div className={(r.total_lost ?? 0) + (r.total_dead ?? 0) > 0 ? "text-danger" : ""}>
                        {fmt((r.total_lost ?? 0) + (r.total_dead ?? 0))} lost/dead
                      </div>
                    </>
                  ) : (
                    <div>{fmt(r.total_received)} returned so far</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Paged>
  );
}

function MonthView({
  dir,
  detail,
  onBack,
}: {
  dir: Direction;
  detail: ReturnType<typeof useMonthDetail>;
  onBack: () => void;
}) {
  return (
    <QueryState queries={[detail]}>
      {() => {
        const d = detail.data!;
        return (
          <>
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              <ArrowLeft className="size-3.5" aria-hidden />
              All months
            </button>
            <Section title={`${d.filter.month_name} ${d.filter.year}`}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile label="Challans" value={fmt(d.summary.total_challans)} />
                <StatTile label="Units sent" value={fmt(d.summary.total_quantity)} />
                <StatTile label="Returned" value={fmt(d.summary.total_received)} />
                {dir === "incoming" && (
                  <StatTile label="Lost / dead" value={fmt((d.summary.total_lost ?? 0) + (d.summary.total_dead ?? 0))} tone={(d.summary.total_lost ?? 0) + (d.summary.total_dead ?? 0) > 0 ? "danger" : undefined} />
                )}
              </div>

              {d.challans.length === 0 ? (
                <div className="mt-4">
                  <EmptyNote>No challans in this month.</EmptyNote>
                </div>
              ) : (
                <div className="mt-4">
                  <Paged items={d.challans} resetKey={`${d.filter.year}-${d.filter.month_name}`}>
                    {(pageRows) => (
                      <TableWrap>
                        <table className="w-full text-sm">
                          <thead className="border-b border-line bg-surface-2/50">
                            <tr>
                              <th className={th}>Document</th>
                              <th className={th}>Date</th>
                              <th className={th}>Exhibition</th>
                              <th className={th}>Warehouse</th>
                              <th className={th}>Vehicle</th>
                              <th className={`${th} text-right`}>Items</th>
                              <th className={`${th} text-right`}>Quantity</th>
                              {dir === "incoming" && <th className={`${th} text-right`}>Lost/dead</th>}
                              <ActionsHeader />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {pageRows.map((c) => (
                              <tr key={c.document_number}>
                                <td className={`${td} font-medium`}>{c.document_number}</td>
                                <td className={`${td} text-muted`}>{fmtDate(c.date)}</td>
                                <td className={td}>{c.exhibition_name}</td>
                                <td className={`${td} text-muted`}>{c.from_warehouse_name}</td>
                                <td className={`${td} text-muted`}>{c.vehicle_no}</td>
                                <td className={`${td} text-right tabular-nums`}>{fmt(c.item_count)}</td>
                                <td className={`${td} text-right tabular-nums`}>{fmt(c.total_quantity)}</td>
                                {dir === "incoming" && (
                                  <td className={`${td} text-right tabular-nums ${(c.total_lost ?? 0) + (c.total_dead ?? 0) > 0 ? "text-danger" : ""}`}>
                                    {fmt((c.total_lost ?? 0) + (c.total_dead ?? 0))}
                                  </td>
                                )}
                                <PrintCell dir={dir} id={c._id} readOnly={c.readOnly} />
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </TableWrap>
                    )}
                  </Paged>
                </div>
              )}
            </Section>
          </>
        );
      }}
    </QueryState>
  );
}

function SearchResults({ dir, keyword, challans }: { dir: Direction; keyword: string; challans: Challan[] }) {
  if (challans.length === 0) {
    return <EmptyNote>No challans match &ldquo;{keyword}&rdquo;.</EmptyNote>;
  }
  return (
    <Paged items={challans} resetKey={keyword}>
      {(pageRows) => (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/50">
              <tr>
                <th className={th}>Document</th>
                <th className={th}>Date</th>
                <th className={th}>Exhibition</th>
                <th className={th}>Warehouse</th>
                <th className={th}>Transporter</th>
                <th className={th}>Vehicle</th>
                <th className={`${th} text-right`}>Items</th>
                <ActionsHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.map((c) => (
                <tr key={c._id}>
                  <td className={`${td} font-medium`}>{c.document_number}</td>
                  <td className={`${td} text-muted`}>{fmtDate(c.date)}</td>
                  <td className={td}>{c.exhibition_name}</td>
                  <td className={`${td} text-muted`}>{c.from_warehouse_name}</td>
                  <td className={`${td} text-muted`}>{c.transporter_name}</td>
                  <td className={`${td} text-muted`}>{c.vehicle_no}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmt(c.items?.length ?? 0)}</td>
                  <PrintCell dir={dir} id={c._id} readOnly={c.readOnly} />
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Paged>
  );
}

function ActionsHeader() {
  return (
    <th className={th}>
      <span className="sr-only">Print</span>
    </th>
  );
}

/** Opens the 2-page A4 letter + delivery challan in a new tab. */
function PrintCell({ dir, id, readOnly }: { dir: Direction; id?: string; readOnly?: boolean }) {
  return (
    <td className={`${td} text-right`}>
      {id && !readOnly && (
        <Link
          href={challanPrintHref(dir, id)}
          target="_blank"
          className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
        >
          <Printer className="size-3.5" aria-hidden />
          Print
        </Link>
      )}
    </td>
  );
}
