"use client";

import { ChevronRight, Tent } from "lucide-react";
import { Paged } from "@/components/pagination";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, QueryState, SearchBox, TableWrap, td, th } from "../_components/reports-ui";
import { fmtDate, useExhibitionsList } from "@/lib/reports";

export function ExhibitionsReportView() {
  const exhibitions = useExhibitionsList();
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const list = (exhibitions.data ?? []).filter((e) => !q || e.name.toLowerCase().includes(q) || e.venue?.toLowerCase().includes(q) || e.city?.toLowerCase().includes(q));

  return (
    <QueryState queries={[exhibitions]}>
      {() => (
        <>
          <div className="mb-3">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name, venue or city" />
          </div>

          {exhibitions.data?.length === 0 ? (
            <EmptyState icon={<Tent className="size-6" />} title="No exhibitions yet">
              Exhibitions are created from the Contractors, Transport or Transactions modules.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No exhibitions match this search.</p>
          ) : (
            <Paged items={list} resetKey={search}>
              {(pageRows) => (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Name</th>
                        <th className={th}>Venue</th>
                        <th className={th}>Dates</th>
                        <th className={th}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((e) => (
                        <tr key={e._id} className="hover:bg-surface-2/40">
                          <td className={td}>
                            <Link href={`/modules/reports/exhibitions/${e._id}`} className="font-medium hover:text-accent hover:underline">
                              {e.name}
                            </Link>
                          </td>
                          <td className={`${td} text-muted`}>
                            {e.venue || "—"}
                            {e.city ? ` — ${e.city}` : ""}
                          </td>
                          <td className={`${td} text-muted`}>
                            {fmtDate(e.startDate)} – {fmtDate(e.endDate)}
                          </td>
                          <td className={`${td} text-right`}>
                            <Link
                              href={`/modules/reports/exhibitions/${e._id}`}
                              className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                            >
                              Summary
                              <ChevronRight className="size-3.5" aria-hidden />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Paged>
          )}
        </>
      )}
    </QueryState>
  );
}
