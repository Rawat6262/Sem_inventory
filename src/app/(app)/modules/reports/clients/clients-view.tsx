"use client";

import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui";
import { Paged } from "@/components/pagination";
import { DealStatusBadge } from "../../client/_components/deal-status-badge";
import { EmptyState, QueryState, SearchBox, Section, StatTile, TableWrap, td, th } from "../_components/reports-ui";
import { fmt, fmtDate, fmtMoney, useClientsSummary, type ClientSummaryRow } from "@/lib/reports";

type Status = ClientSummaryRow["status"];
const STATUS_LABELS: Record<Status, string> = { lead: "Lead", final: "Final", fully_paid: "Fully paid", rejected: "Rejected" };

export function ClientsReportView() {
  const clients = useClientsSummary();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");

  const all = useMemo(() => clients.data ?? [], [clients.data]);

  // Lead funnel: open leads → converted (something paid) or rejected.
  const funnel = useMemo(() => {
    const count = (s: Status) => all.filter((c) => c.status === s).length;
    const converted = count("final") + count("fully_paid");
    const rejected = all.filter((c) => c.status === "rejected");
    return {
      total: all.length,
      lead: count("lead"),
      converted,
      rejected: rejected.length,
      lostValue: rejected.reduce((s, c) => s + (c.lost_deal_value || 0), 0),
      conversion: all.length ? Math.round((converted / all.length) * 100) : 0,
    };
  }, [all]);

  const rejectedLeads = useMemo(
    () => all.filter((c) => c.status === "rejected").sort((a, b) => new Date(b.rejected_at ?? 0).getTime() - new Date(a.rejected_at ?? 0).getTime()),
    [all],
  );

  const q = search.trim().toLowerCase();
  const list = all.filter(
    (c) => (!status || c.status === status) && (!q || c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.phone?.includes(q)),
  );

  return (
    <QueryState queries={[clients]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Clients" value={fmt(funnel.total)} />
            <StatTile label="Open leads" value={fmt(funnel.lead)} hint="Nothing paid yet" />
            <StatTile label="Converted" value={fmt(funnel.converted)} tone="success" hint="Final or fully paid" />
            <StatTile label="Rejected" value={fmt(funnel.rejected)} tone={funnel.rejected > 0 ? "danger" : undefined} hint={`${fmtMoney(funnel.lostValue)} in deals lost`} />
            <StatTile label="Conversion rate" value={`${funnel.conversion}%`} tone="accent" hint="Converted out of all clients" />
          </div>

          <div className="mt-8 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name, company or phone" />
            <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as Status | "")} className="sm:w-48">
              <option value="">All statuses ({fmt(all.length)})</option>
              {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]} ({fmt(all.filter((c) => c.status === s).length)})
                </option>
              ))}
            </Select>
          </div>

          {all.length === 0 ? (
            <EmptyState icon={<Users className="size-6" />} title="No clients yet" />
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No clients match these filters.</p>
          ) : (
            <Paged items={list} resetKey={`${search}|${status}`}>
              {(pageRows) => (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Client</th>
                        <th className={th}>Status</th>
                        <th className={th}>Added by</th>
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
                      {pageRows.map((c) => {
                        const remaining = c.total_deal_amount - c.total_paid;
                        return (
                          <tr key={c.id} className="hover:bg-surface-2/40">
                            <td className={td}>
                              <Link href={`/modules/reports/clients/${c.id}`} className="font-medium hover:text-accent hover:underline">
                                {c.company || c.name}
                              </Link>
                              {c.company ? <div className="text-xs text-muted">{c.name}</div> : null}
                            </td>
                            <td className={td}>
                              {c.status ? <DealStatusBadge status={c.status} /> : null}
                            </td>
                            <td className={`${td} text-muted`}>{c.added_by ?? "—"}</td>
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
            </Paged>
          )}

          <Section title={`Rejected leads (${fmt(rejectedLeads.length)})`} description="Why leads didn't work out, newest first. They're left out of every total above.">
            {rejectedLeads.length === 0 ? (
              <p className="text-sm text-muted">No leads have been rejected.</p>
            ) : (
              <Paged items={rejectedLeads}>
                {(pageRows) => (
                  <TableWrap>
                    <table className="w-full text-sm">
                      <thead className="border-b border-line bg-surface-2/50">
                        <tr>
                          <th className={th}>Client</th>
                          <th className={th}>Reason</th>
                          <th className={th}>Rejected by</th>
                          <th className={th}>Date</th>
                          <th className={`${th} text-right`}>Deal lost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {pageRows.map((c) => (
                          <tr key={c.id}>
                            <td className={td}>
                              <Link href={`/modules/client/${c.id}`} className="font-medium hover:text-accent hover:underline">
                                {c.company || c.name}
                              </Link>
                              {c.company && <div className="text-xs text-muted">{c.name}</div>}
                            </td>
                            <td className={`${td} max-w-96 whitespace-normal`}>{c.reject_reason || "—"}</td>
                            <td className={`${td} text-muted`}>{c.rejected_by ?? "—"}</td>
                            <td className={`${td} text-muted`}>{fmtDate(c.rejected_at)}</td>
                            <td className={`${td} text-right tabular-nums text-muted`}>{fmtMoney(c.lost_deal_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                )}
              </Paged>
            )}
          </Section>
        </>
      )}
    </QueryState>
  );
}
