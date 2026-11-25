"use client";

import { useParams } from "next/navigation";
import { Paged } from "@/components/pagination";
import { BackLink, QueryState, Section, StatTile, TableWrap, td, th } from "../../_components/reports-ui";
import { fmtDate, fmtMoney, useExhibitionSummary, type ExhibitionMoneySection, type ExhibitionVendorSection } from "@/lib/reports";

export function ExhibitionSummaryDetail() {
  const { id } = useParams<{ id: string }>();
  const summary = useExhibitionSummary(id);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/modules/reports/exhibitions">← All exhibitions</BackLink>

      <QueryState queries={[summary]}>
        {() => {
          const d = summary.data!;
          return (
            <>
              <div>
                <h2 className="text-xl font-semibold">{d.exhibition.name}</h2>
                <p className="text-sm text-muted">
                  {d.exhibition.venue ? `${d.exhibition.venue} · ` : ""}
                  {fmtDate(d.exhibition.startDate)} – {fmtDate(d.exhibition.endDate)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatTile label="Revenue billed" value={fmtMoney(d.overall.revenue_billed)} />
                <StatTile label="Revenue collected" value={fmtMoney(d.overall.revenue_collected)} tone="success" />
                <StatTile label="Expense agreed" value={fmtMoney(d.overall.expense_agreed)} />
                <StatTile label="Expense recorded" value={fmtMoney(d.overall.expense_recorded)} tone="danger" />
                <StatTile
                  label="Profit (projected)"
                  value={fmtMoney(d.overall.profit_projected)}
                  tone={d.overall.profit_projected >= 0 ? "accent" : "danger"}
                />
                <StatTile label="Profit (actual)" value={fmtMoney(d.overall.profit_actual)} tone={d.overall.profit_actual >= 0 ? "accent" : "danger"} />
              </div>

              <Section title="Contractors" description="Agreed (DealAmount) vs. recorded (Transactions) per labour contractor.">
                <PersonTable section={d.labour} />
              </Section>

              <Section title="Transporters">
                <PersonTable section={d.transporter} />
              </Section>

              <Section title="Supervisors">
                <PersonTable section={d.supervisor} />
              </Section>

              <Section title="Vendors" description="Vendors have no agreed amount in this system — recorded counts as fully paid.">
                <VendorTable section={d.vendor} />
              </Section>

              <Section title="Clients" description="Stall revenue billed vs. collected.">
                {d.client.clients.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">No clients booked for this exhibition.</p>
                ) : (
                  <Paged items={d.client.clients}>
                    {(pageRows) => (
                      <TableWrap>
                        <table className="w-full text-sm">
                          <thead className="border-b border-line bg-surface-2/50">
                            <tr>
                              <th className={th}>Client</th>
                              <th className={`${th} text-right`}>Deal amount</th>
                              <th className={`${th} text-right`}>Paid</th>
                              <th className={`${th} text-right`}>Remaining</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {pageRows.map((c) => (
                              <tr key={c.client_id}>
                                <td className={td}>
                                  {c.name}
                                  {c.company ? <span className="text-muted"> · {c.company}</span> : null}
                                </td>
                                <td className={`${td} text-right`}>{fmtMoney(c.total_deal_amount)}</td>
                                <td className={`${td} text-right text-success`}>{fmtMoney(c.total_paid)}</td>
                                <td className={`${td} text-right ${c.total_remaining > 0 ? "text-warn" : "text-muted"}`}>{fmtMoney(c.total_remaining)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </TableWrap>
                    )}
                  </Paged>
                )}
              </Section>

              <Section title="Stock sent to this exhibition" description="Per warehouse: units sent, returned, lost and dead.">
                {d.warehouseProducts.byWarehouse.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">No stock dispatched to this exhibition yet.</p>
                ) : (
                  <Paged items={d.warehouseProducts.byWarehouse.flatMap((wh) => wh.products.map((p) => ({ wh, p })))}>
                    {(pageRows) => (
                      <TableWrap>
                        <table className="w-full text-sm">
                          <thead className="border-b border-line bg-surface-2/50">
                            <tr>
                              <th className={th}>Warehouse</th>
                              <th className={th}>Product</th>
                              <th className={`${th} text-right`}>Sent</th>
                              <th className={`${th} text-right`}>Returned</th>
                              <th className={`${th} text-right`}>Still out</th>
                              <th className={`${th} text-right`}>Lost</th>
                              <th className={`${th} text-right`}>Dead</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {pageRows.map(({ wh, p }) => (
                              <tr key={`${wh.warehouse_id}-${p.product_id}`}>
                                <td className={`${td} text-muted`}>{wh.warehouse_name}</td>
                                <td className={td}>{p.product_name}</td>
                                <td className={`${td} text-right`}>{p.total_sent}</td>
                                <td className={`${td} text-right`}>{p.total_returned}</td>
                                <td className={`${td} text-right`}>{p.still_pending}</td>
                                <td className={`${td} text-right text-danger`}>{p.lost}</td>
                                <td className={`${td} text-right text-danger`}>{p.dead}</td>
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
          );
        }}
      </QueryState>
    </div>
  );
}

function PersonTable({ section }: { section: ExhibitionMoneySection }) {
  if (section.people.length === 0) return <p className="py-6 text-center text-sm text-muted">Nothing recorded for this exhibition.</p>;
  return (
    <Paged items={section.people}>
      {(pageRows) => (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/50">
              <tr>
                <th className={th}>Name</th>
                <th className={`${th} text-right`}>Agreed</th>
                <th className={`${th} text-right`}>Recorded</th>
                <th className={`${th} text-right`}>Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.map((p) => (
                <tr key={p.id}>
                  <td className={td}>{p.name || "Unknown"}</td>
                  <td className={`${td} text-right`}>{fmtMoney(p.expense_amount)}</td>
                  <td className={`${td} text-right`}>{fmtMoney(p.deal_amount)}</td>
                  <td className={`${td} text-right ${p.pending_amount < 0 ? "text-warn" : "text-muted"}`}>{fmtMoney(p.pending_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Paged>
  );
}

function VendorTable({ section }: { section: ExhibitionVendorSection }) {
  if (section.people.length === 0) return <p className="py-6 text-center text-sm text-muted">No vendor costs recorded for this exhibition.</p>;
  return (
    <Paged items={section.people}>
      {(pageRows) => (
        <TableWrap>
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2/50">
              <tr>
                <th className={th}>Name</th>
                <th className={`${th} text-right`}>Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.map((v) => (
                <tr key={v.id}>
                  <td className={td}>{v.name || "Unknown"}</td>
                  <td className={`${td} text-right`}>{fmtMoney(v.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </Paged>
  );
}
