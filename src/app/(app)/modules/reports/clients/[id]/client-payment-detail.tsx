"use client";

import { useParams } from "next/navigation";
import { BackLink, QueryState, Section, StatTile, TableWrap, td, th } from "../../_components/reports-ui";
import { fmtMoney, useClientPaymentReport } from "@/lib/reports";

export function ClientPaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const report = useClientPaymentReport(id);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/modules/reports/clients">← All clients</BackLink>

      <QueryState queries={[report]}>
        {() => {
          const d = report.data!;
          return (
            <>
              <div>
                <h2 className="text-xl font-semibold">{d.client.name}</h2>
                {d.client.company && <p className="text-sm text-muted">{d.client.company}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <StatTile label="Exhibitions" value={d.summary.total_exhibitions} />
                <StatTile label="Stalls" value={d.summary.total_stalls} />
                <StatTile label="Deal amount" value={fmtMoney(d.summary.grand_deal_amount)} />
                <StatTile label="Paid" value={fmtMoney(d.summary.grand_paid)} tone="success" />
                <StatTile label="Remaining" value={fmtMoney(d.summary.grand_remaining)} tone={d.summary.grand_remaining > 0 ? "warn" : "accent"} />
              </div>

              {d.exhibitions.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">This client has no stalls booked yet.</p>
              ) : (
                d.exhibitions.map((exh) => (
                  <Section
                    key={exh.exhibition_id}
                    title={exh.exhibition_name}
                    description={`${exh.stalls_count} stall(s) · ${exh.financial_summary.paid_percentage}% paid`}
                  >
                    <TableWrap>
                      <table className="w-full text-sm">
                        <thead className="border-b border-line bg-surface-2/50">
                          <tr>
                            <th className={th}>Stall</th>
                            <th className={`${th} text-right`}>Deal amount</th>
                            <th className={`${th} text-right`}>Paid</th>
                            <th className={`${th} text-right`}>Remaining</th>
                            <th className={th}>Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {exh.stall_details.map((s, i) => (
                            <tr key={i}>
                              <td className={td}>
                                {s.stall_name || "—"}
                                {s.stall_no ? <span className="text-muted"> (#{s.stall_no})</span> : null}
                              </td>
                              <td className={`${td} text-right`}>{fmtMoney(s.deal_amount)}</td>
                              <td className={`${td} text-right text-success`}>{fmtMoney(s.paid)}</td>
                              <td className={`${td} text-right ${s.remaining > 0 ? "text-warn" : "text-muted"}`}>{fmtMoney(s.remaining)}</td>
                              <td className={`${td} text-muted`}>{s.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableWrap>
                  </Section>
                ))
              )}
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
