"use client";

import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, QueryState, SearchBox, TableWrap, td, th } from "../_components/reports-ui";
import { fmtMoney, useClientsSummary } from "@/lib/reports";

export function ClientsReportView() {
  const clients = useClientsSummary();
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const list = (clients.data ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.phone?.includes(q));

  return (
    <QueryState queries={[clients]}>
      {() => (
        <>
          <div className="mb-3">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name, company or phone" />
          </div>

          {clients.data?.length === 0 ? (
            <EmptyState icon={<Users className="size-6" />} title="No clients yet" />
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No clients match this search.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Client</th>
                    <th className={`${th} text-right`}>Exhibitions</th>
                    <th className={`${th} text-right`}>Stalls</th>
                    <th className={`${th} text-right`}>Deal amount</th>
                    <th className={`${th} text-right`}>Paid</th>
                    <th className={`${th} text-right`}>Remaining</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((c) => {
                    const remaining = c.total_deal_amount - c.total_paid;
                    return (
                      <tr key={c.id} className="hover:bg-surface-2/40">
                        <td className={td}>
                          <Link href={`/modules/reports/clients/${c.id}`} className="font-medium hover:text-accent hover:underline">
                            {c.name}
                          </Link>
                          {c.company ? <span className="text-muted"> · {c.company}</span> : null}
                        </td>
                        <td className={`${td} text-right text-muted`}>{c.exhibitions_count}</td>
                        <td className={`${td} text-right text-muted`}>{c.stalls_count}</td>
                        <td className={`${td} text-right`}>{fmtMoney(c.total_deal_amount)}</td>
                        <td className={`${td} text-right text-success`}>{fmtMoney(c.total_paid)}</td>
                        <td className={`${td} text-right ${remaining > 0 ? "text-warn" : "text-muted"}`}>{fmtMoney(remaining)}</td>
                        <td className={`${td} text-right`}>
                          <Link
                            href={`/modules/reports/clients/${c.id}`}
                            className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                          >
                            Report
                            <ChevronRight className="size-3.5" aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}
    </QueryState>
  );
}
