"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui";
import { QueryState, Section, StatTile, TableWrap, td, th } from "./_components/reports-ui";
import {
  fmtMoney,
  MONTH_NAMES,
  useProjectMonthDetail,
  useProjectTimeline,
  type ExpenseCategoryDetail,
} from "@/lib/reports";

const CATEGORY_LABELS: Record<"labour" | "transporter" | "supervisor" | "vendor", string> = {
  labour: "Contractors",
  transporter: "Transporters",
  supervisor: "Supervisors",
  vendor: "Vendors",
};

export function MoneyView() {
  const timeline = useProjectTimeline(null);
  const [selected, setSelected] = useState<{ year: number; month: number } | null>(null);
  const [yearFilter, setYearFilter] = useState<number | "">("");

  const years = useMemo(() => [...new Set((timeline.data ?? []).map((r) => r.year))].sort((a, b) => b - a), [timeline.data]);
  const rows = useMemo(
    () => (timeline.data ?? []).filter((r) => yearFilter === "" || r.year === yearFilter).sort((a, b) => b.year - a.year || b.month - a.month),
    [timeline.data, yearFilter],
  );

  const totals = rows.reduce(
    (acc, r) => {
      acc.expense_recorded += r.expense_recorded;
      acc.expense_paid += r.expense_paid;
      acc.revenue_collected += r.revenue_collected;
      acc.profit_actual += r.profit_actual;
      return acc;
    },
    { expense_recorded: 0, expense_paid: 0, revenue_collected: 0, profit_actual: 0 },
  );

  return (
    <QueryState queries={[timeline]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Revenue collected" value={fmtMoney(totals.revenue_collected)} tone="success" />
            <StatTile label="Expense paid" value={fmtMoney(totals.expense_paid)} tone="danger" hint={`of ${fmtMoney(totals.expense_recorded)} recorded`} />
            <StatTile label="Profit (actual)" value={fmtMoney(totals.profit_actual)} tone={totals.profit_actual >= 0 ? "accent" : "danger"} />
            <StatTile label="Months shown" value={rows.length} />
          </div>

          <Section
            title="Monthly timeline"
            description="Revenue collected from clients vs. what's been paid to labour, transporters, supervisors and vendors, every month."
            action={
              <Select aria-label="Filter by year" value={yearFilter} onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : "")} className="w-32">
                <option value="">All years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            }
          >
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No transactions or payments recorded yet.</p>
            ) : (
              <TableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-surface-2/50">
                    <tr>
                      <th className={th}>Month</th>
                      <th className={`${th} text-right`}>Revenue</th>
                      <th className={`${th} text-right`}>Expense paid</th>
                      <th className={`${th} text-right`}>Profit</th>
                      <th className={`${th} text-right`}>Outgoing</th>
                      <th className={`${th} text-right`}>Incoming</th>
                      <th className={th}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={`${r.year}-${r.month}`} className="hover:bg-surface-2/40">
                        <td className={`${td} font-medium`}>
                          {r.month_name} {r.year}
                        </td>
                        <td className={`${td} text-right text-success`}>{fmtMoney(r.revenue_collected)}</td>
                        <td className={`${td} text-right`}>{fmtMoney(r.expense_paid)}</td>
                        <td className={`${td} text-right ${r.profit_actual >= 0 ? "text-accent" : "text-danger"}`}>{fmtMoney(r.profit_actual)}</td>
                        <td className={`${td} text-right text-muted`}>
                          {r.outgoing_challans} ({r.outgoing_quantity} units)
                        </td>
                        <td className={`${td} text-right text-muted`}>
                          {r.incoming_challans} ({r.incoming_quantity} units)
                        </td>
                        <td className={`${td} text-right`}>
                          <button
                            type="button"
                            onClick={() => setSelected({ year: r.year, month: r.month })}
                            className="text-sm font-medium text-accent hover:underline"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </Section>

          {selected && <MonthDetailPanel year={selected.year} month={selected.month} onClose={() => setSelected(null)} />}
        </>
      )}
    </QueryState>
  );
}

function MonthDetailPanel({ year, month, onClose }: { year: number; month: number; onClose: () => void }) {
  const detail = useProjectMonthDetail(year, month);

  return (
    <Section title={`${MONTH_NAMES[month - 1]} ${year} in detail`} action={<button onClick={onClose} className="text-sm text-muted hover:text-ink">Close</button>}>
      <QueryState queries={[detail]}>
        {() => {
          const d = detail.data!.data;
          return (
            <div className="flex flex-col gap-6">
              <ul className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
                {d.highlights.map((h, i) => (
                  <li key={i} className="text-ink">
                    • {h}
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((cat) => (
                  <CategoryCard key={cat} label={CATEGORY_LABELS[cat]} detail={d.expenses.by_category[cat]} />
                ))}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Payments received ({d.revenue.payment_count})</h3>
                {d.revenue.payments.length === 0 ? (
                  <p className="text-sm text-muted">No client payments recorded this month.</p>
                ) : (
                  <TableWrap>
                    <table className="w-full text-sm">
                      <thead className="border-b border-line bg-surface-2/50">
                        <tr>
                          <th className={th}>Date</th>
                          <th className={th}>Client</th>
                          <th className={th}>Exhibition</th>
                          <th className={`${th} text-right`}>Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {d.revenue.payments.map((p, i) => (
                          <tr key={i}>
                            <td className={`${td} text-muted`}>{new Date(p.date).toLocaleDateString("en-IN")}</td>
                            <td className={td}>{p.client_name}</td>
                            <td className={`${td} text-muted`}>{p.exhibition_name}</td>
                            <td className={`${td} text-right text-success`}>{fmtMoney(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                )}
              </div>
            </div>
          );
        }}
      </QueryState>
    </Section>
  );
}

function CategoryCard({ label, detail }: { label: string; detail: ExpenseCategoryDetail }) {
  const top = [...detail.people].sort((a, b) => b.paid - a.paid).slice(0, 3);
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{fmtMoney(detail.totals.paid)}</p>
      {top.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5 text-xs text-muted">
          {top.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span className="truncate">{p.name}</span>
              <span className="shrink-0 tabular-nums">{fmtMoney(p.paid)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
