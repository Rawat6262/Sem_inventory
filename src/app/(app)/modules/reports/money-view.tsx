"use client";

import { ArrowDownRight, ArrowUpRight, CalendarRange } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Select, cn } from "@/components/ui";
import { EmptyState, QueryState, Section, TableWrap, td, th } from "./_components/reports-ui";
import { MoneyChart } from "./_components/money-chart";
import { fmt, fmtDate, fmtMoney, MONTH_NAMES, useProjectMonthDetail, useProjectTimeline, type MonthRow } from "@/lib/reports";

// The business report for one year or one month: headline numbers (with the
// change from the period before), a plain-English summary, then the detail.
// Money in = client payments; money out = payments to contractors,
// transporters, supervisors and vendors; profit = in − out. Stock purchases are
// shown on their own and are not part of profit.

const SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
type Period = { year: number; month: number | null }; // month null = whole year

type Totals = {
  moneyIn: number;
  moneyOut: number;
  profit: number;
  payments: number;
  purchases: number;
  purchaseCount: number;
  purchaseWaiting: number;
  newClients: number;
  rejected: number;
  outChallans: number;
  outUnits: number;
  inChallans: number;
  inUnits: number;
  lost: number;
};

const ZERO: Totals = { moneyIn: 0, moneyOut: 0, profit: 0, payments: 0, purchases: 0, purchaseCount: 0, purchaseWaiting: 0, newClients: 0, rejected: 0, outChallans: 0, outUnits: 0, inChallans: 0, inUnits: 0, lost: 0 };

function add(t: Totals, r: MonthRow): Totals {
  return {
    moneyIn: t.moneyIn + r.revenue_collected,
    moneyOut: t.moneyOut + r.expense_paid,
    profit: t.profit + r.profit_actual,
    payments: t.payments + r.payment_count,
    purchases: t.purchases + (r.purchase_amount ?? 0),
    purchaseCount: t.purchaseCount + (r.purchase_count ?? 0),
    purchaseWaiting: t.purchaseWaiting + (r.purchase_pending ?? 0),
    newClients: t.newClients + (r.new_clients ?? 0),
    rejected: t.rejected + (r.rejected_leads ?? 0),
    outChallans: t.outChallans + r.outgoing_challans,
    outUnits: t.outUnits + r.outgoing_quantity,
    inChallans: t.inChallans + r.incoming_challans,
    inUnits: t.inUnits + (r.incoming_quantity - r.incoming_lost - r.incoming_dead),
    lost: t.lost + r.incoming_lost + r.incoming_dead,
  };
}

const periodLabel = (p: Period) => (p.month ? `${MONTH_NAMES[p.month - 1]} ${p.year}` : String(p.year));
const previous = (p: Period): Period => (p.month ? (p.month === 1 ? { year: p.year - 1, month: 12 } : { year: p.year, month: p.month - 1 }) : { year: p.year - 1, month: null });

export function MoneyView() {
  const timeline = useProjectTimeline(null);
  const rows = useMemo(() => timeline.data ?? [], [timeline.data]);
  const byKey = useMemo(() => new Map(rows.map((r) => [`${r.year}-${r.month}`, r])), [rows]);

  const now = new Date();
  const years = useMemo(() => [...new Set([now.getFullYear(), ...rows.map((r) => r.year)])].sort((a, b) => b - a), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start on the latest month that has anything in it.
  const latest = rows.length ? rows.reduce((a, b) => (b.year > a.year || (b.year === a.year && b.month > a.month) ? b : a)) : null;
  const [picked, setPicked] = useState<Period | null>(null);
  const period: Period = picked ?? (latest ? { year: latest.year, month: latest.month } : { year: now.getFullYear(), month: null });

  const totalsFor = (p: Period): Totals => {
    if (p.month) {
      const r = byKey.get(`${p.year}-${p.month}`);
      return r ? add(ZERO, r) : ZERO;
    }
    return rows.filter((r) => r.year === p.year).reduce(add, ZERO);
  };
  const cur = totalsFor(period);
  const prev = totalsFor(previous(period));
  const prevLabel = periodLabel(previous(period));

  return (
    <QueryState queries={[timeline]}>
      {() => (
        <>
          <PeriodPicker period={period} years={years} hasData={(y, m) => byKey.has(`${y}-${m}`)} onChange={setPicked} />

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{periodLabel(period)} report</h2>
            <p className="text-xs text-muted">Compared with {prevLabel}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Money in" value={fmtMoney(cur.moneyIn)} sub={`${fmt(cur.payments)} client payment(s)`} change={change(cur.moneyIn, prev.moneyIn)} good="up" />
            <Kpi label="Money out" value={fmtMoney(cur.moneyOut)} sub="Contractors, transporters, supervisors, vendors" change={change(cur.moneyOut, prev.moneyOut)} good="down" />
            <Kpi
              label="Profit"
              value={fmtMoney(cur.profit)}
              valueTone={cur.profit < 0 ? "danger" : "accent"}
              sub={cur.moneyIn > 0 ? `${Math.round((cur.profit / cur.moneyIn) * 100)}% of money in` : "Money in minus money out"}
              change={change(cur.profit, prev.profit)}
              good="up"
            />
            <Kpi label="Stock bought" value={fmtMoney(cur.purchases)} sub={`${fmt(cur.purchaseCount)} purchase(s)${cur.purchaseWaiting ? `, ${fmt(cur.purchaseWaiting)} waiting` : ""} · not in profit`} change={change(cur.purchases, prev.purchases)} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat label="New clients" value={fmt(cur.newClients)} />
            <MiniStat label="Leads rejected" value={fmt(cur.rejected)} />
            <MiniStat label="Goods sent out" value={`${fmt(cur.outUnits)} units`} sub={`${fmt(cur.outChallans)} challan(s)`} />
            <MiniStat label="Goods returned" value={`${fmt(cur.inUnits)} units`} sub={`${fmt(cur.inChallans)} challan(s)${cur.lost ? ` · ${fmt(cur.lost)} lost/dead` : ""}`} />
          </div>

          {period.month ? (
            <MonthReport year={period.year} month={period.month} cur={cur} prev={prev} prevLabel={prevLabel} />
          ) : (
            <YearReport year={period.year} rows={rows.filter((r) => r.year === period.year)} cur={cur} prev={prev} prevLabel={prevLabel} onOpenMonth={(m) => setPicked({ year: period.year, month: m })} />
          )}
        </>
      )}
    </QueryState>
  );
}

// ─── Period picker ─────────────────────────────────────────────────────────

function PeriodPicker({ period, years, hasData, onChange }: { period: Period; years: number[]; hasData: (y: number, m: number) => boolean; onChange: (p: Period) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <CalendarRange className="size-4 text-muted" aria-hidden />
        <Select aria-label="Year" value={period.year} onChange={(e) => onChange({ year: Number(e.target.value), month: period.month })} className="w-28">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <div role="tablist" aria-label="Month" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:pb-0">
        <PeriodPill active={period.month === null} onClick={() => onChange({ year: period.year, month: null })}>
          Whole year
        </PeriodPill>
        {SHORT.map((m, i) => (
          <PeriodPill key={m} active={period.month === i + 1} muted={!hasData(period.year, i + 1)} onClick={() => onChange({ year: period.year, month: i + 1 })}>
            {m}
          </PeriodPill>
        ))}
      </div>
    </div>
  );
}

function PeriodPill({ active, muted, onClick, children }: { active: boolean; muted?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap",
        active ? "bg-accent text-accent-ink" : muted ? "text-muted/60 hover:bg-surface-2 hover:text-muted" : "text-ink hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

// ─── Headline numbers ──────────────────────────────────────────────────────

type Change = { pct: number | null; diff: number };
const change = (cur: number, prev: number): Change => ({ diff: cur - prev, pct: prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null });

function Kpi({ label, value, sub, change: ch, good, valueTone }: { label: string; value: string; sub: string; change: Change; good?: "up" | "down"; valueTone?: "accent" | "danger" }) {
  const up = ch.diff > 0;
  const flat = ch.diff === 0;
  const tone = flat || !good ? "text-muted" : (up && good === "up") || (!up && good === "down") ? "text-success" : "text-danger";
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", valueTone === "accent" && "text-accent", valueTone === "danger" && "text-danger")}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
      <p className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", tone)}>
        {flat ? (
          "No change"
        ) : (
          <>
            {up ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
            {up ? "+" : "−"}
            {fmtMoney(Math.abs(ch.diff))}
            {ch.pct != null && Math.abs(ch.pct) < 1000 ? ` (${up ? "+" : "−"}${Math.abs(Math.round(ch.pct))}%)` : ""}
          </>
        )}
      </p>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Summary({ lines }: { lines: string[] }) {
  return (
    <Section title="In short">
      <ul className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const moreLess = (diff: number, what: string, prevLabel: string) =>
  diff === 0 ? `the same ${what} as ${prevLabel}` : `${fmtMoney(Math.abs(diff))} ${diff > 0 ? "more" : "less"} ${what} than ${prevLabel}`;

// ─── Year report ───────────────────────────────────────────────────────────

function YearReport({ year, rows, cur, prev, prevLabel, onOpenMonth }: { year: number; rows: MonthRow[]; cur: Totals; prev: Totals; prevLabel: string; onOpenMonth: (m: number) => void }) {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const months = SHORT.map((label, i) => {
    const r = byMonth.get(i + 1);
    return { label, month: i + 1, row: r, moneyIn: r?.revenue_collected ?? 0, moneyOut: r?.expense_paid ?? 0 };
  });
  const active = months.filter((m) => m.row);
  const best = [...active].sort((a, b) => (b.row!.profit_actual ?? 0) - (a.row!.profit_actual ?? 0))[0];
  const worst = [...active].sort((a, b) => (a.row!.profit_actual ?? 0) - (b.row!.profit_actual ?? 0))[0];

  const lines: string[] = [];
  if (active.length === 0) {
    lines.push(`Nothing has been recorded for ${year} yet.`);
  } else {
    lines.push(`In ${year} you collected ${fmtMoney(cur.moneyIn)} from clients and paid out ${fmtMoney(cur.moneyOut)}, leaving a profit of ${fmtMoney(cur.profit)}.`);
    if (prev.moneyIn || prev.moneyOut) lines.push(`That is ${moreLess(cur.moneyIn - prev.moneyIn, "money in", prevLabel)}, and ${moreLess(cur.profit - prev.profit, "profit", prevLabel)}.`);
    if (best) lines.push(`Best month: ${MONTH_NAMES[best.month - 1]} (${fmtMoney(best.row!.profit_actual)} profit).${worst && worst !== best ? ` Weakest: ${MONTH_NAMES[worst.month - 1]} (${fmtMoney(worst.row!.profit_actual)}).` : ""}`);
    if (cur.purchaseCount) lines.push(`${fmtMoney(cur.purchases)} was spent on ${fmt(cur.purchaseCount)} stock purchase(s)${cur.purchaseWaiting ? `; ${fmt(cur.purchaseWaiting)} of them are still waiting to be received` : ""}.`);
    lines.push(`${fmt(cur.newClients)} new client(s) were added${cur.rejected ? ` and ${fmt(cur.rejected)} lead(s) were rejected` : ""}.`);
    if (cur.outChallans || cur.inChallans) lines.push(`${fmt(cur.outUnits)} units went out on ${fmt(cur.outChallans)} challan(s); ${fmt(cur.inUnits)} came back${cur.lost ? ` and ${fmt(cur.lost)} were lost or dead` : ""}.`);
  }

  return (
    <>
      <Summary lines={lines} />

      <Section title="Month by month" description="Money in and money out each month. Hover a month for exact figures, or click a row below to open that month's report.">
        {active.length === 0 ? (
          <EmptyState icon={<CalendarRange className="size-6" />} title={`Nothing recorded in ${year}`}>
            Pick another year above.
          </EmptyState>
        ) : (
          <>
            <div className="rounded-xl border border-line bg-surface p-3">
              <MoneyChart months={months} />
            </div>
            <div className="mt-4">
              <TableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-surface-2/50">
                    <tr>
                      <th className={th}>Month</th>
                      <th className={`${th} text-right`}>Money in</th>
                      <th className={`${th} text-right`}>Money out</th>
                      <th className={`${th} text-right`}>Profit</th>
                      <th className={`${th} text-right`}>Stock bought</th>
                      <th className={`${th} text-right`}>New clients</th>
                      <th className={`${th} text-right`}>Rejected</th>
                      <th className={`${th} text-right`}>Units out / back</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {months.map(({ month, row: r }) => (
                      <tr
                        key={month}
                        onClick={() => r && onOpenMonth(month)}
                        className={r ? "cursor-pointer hover:bg-surface-2/40" : "text-muted"}
                      >
                        <td className={`${td} font-medium`}>
                          {r ? (
                            <button type="button" className="hover:text-accent hover:underline" onClick={(e) => { e.stopPropagation(); onOpenMonth(month); }}>
                              {MONTH_NAMES[month - 1]}
                            </button>
                          ) : (
                            MONTH_NAMES[month - 1]
                          )}
                        </td>
                        <td className={`${td} text-right tabular-nums`}>{r ? fmtMoney(r.revenue_collected) : "—"}</td>
                        <td className={`${td} text-right tabular-nums`}>{r ? fmtMoney(r.expense_paid) : "—"}</td>
                        <td className={`${td} text-right tabular-nums font-medium ${r && r.profit_actual < 0 ? "text-danger" : ""}`}>{r ? fmtMoney(r.profit_actual) : "—"}</td>
                        <td className={`${td} text-right tabular-nums`}>{r?.purchase_count ? fmtMoney(r.purchase_amount) : "—"}</td>
                        <td className={`${td} text-right tabular-nums`}>{r?.new_clients ? fmt(r.new_clients) : "—"}</td>
                        <td className={`${td} text-right tabular-nums`}>{r?.rejected_leads ? fmt(r.rejected_leads) : "—"}</td>
                        <td className={`${td} text-right tabular-nums text-muted`}>
                          {r && (r.outgoing_quantity || r.incoming_quantity) ? `${fmt(r.outgoing_quantity)} / ${fmt(r.incoming_quantity - r.incoming_lost - r.incoming_dead)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-line bg-surface-2/50 font-semibold">
                    <tr>
                      <td className={td}>{year} total</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtMoney(cur.moneyIn)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtMoney(cur.moneyOut)}</td>
                      <td className={`${td} text-right tabular-nums ${cur.profit < 0 ? "text-danger" : ""}`}>{fmtMoney(cur.profit)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtMoney(cur.purchases)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(cur.newClients)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmt(cur.rejected)}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {fmt(cur.outUnits)} / {fmt(cur.inUnits)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </TableWrap>
            </div>
          </>
        )}
      </Section>
    </>
  );
}

// ─── Month report ──────────────────────────────────────────────────────────

const TYPE_LABEL = { labour: "Contractor", transporter: "Transporter", supervisor: "Supervisor", vendor: "Vendor" } as const;

function MonthReport({ year, month, cur, prev, prevLabel }: { year: number; month: number; cur: Totals; prev: Totals; prevLabel: string }) {
  const detail = useProjectMonthDetail(year, month);
  const label = `${MONTH_NAMES[month - 1]} ${year}`;

  return (
    <QueryState queries={[detail]}>
      {() => {
        const d = detail.data!.data;
        const payees = (Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[])
          .flatMap((cat) => d.expenses.by_category[cat].people.map((p) => ({ ...p, type: TYPE_LABEL[cat] })))
          .sort((a, b) => b.paid - a.paid);
        const payments = [...d.revenue.payments].sort((a, b) => b.amount - a.amount);
        const purchases = d.purchases;
        const rejected = d.rejected_leads;
        const out = d.logistics.outgoing.totals;
        const back = d.logistics.incoming.totals;

        const lines: string[] = [];
        const nothing = !cur.moneyIn && !cur.moneyOut && !cur.purchaseCount && !out.total_challans && !back.total_challans && !d.new_clients.count && !d.exhibitions.active.length;
        if (nothing) lines.push(`Nothing was recorded in ${label}.`);
        else {
          lines.push(`In ${label} you collected ${fmtMoney(cur.moneyIn)} from clients and paid out ${fmtMoney(cur.moneyOut)}, leaving a profit of ${fmtMoney(cur.profit)}.`);
          if (prev.moneyIn || prev.moneyOut) lines.push(`That is ${moreLess(cur.moneyIn - prev.moneyIn, "money in", prevLabel)}, and ${moreLess(cur.profit - prev.profit, "profit", prevLabel)}.`);
          if (payments[0]?.amount > 0) lines.push(`Biggest payment received: ${fmtMoney(payments[0].amount)} from ${payments[0].company_name || payments[0].client_name} for ${payments[0].exhibition_name}.`);
          if (payees[0]) lines.push(`Biggest payment made: ${fmtMoney(payees[0].paid)} to ${payees[0].name} (${payees[0].type.toLowerCase()}).`);
          if (purchases?.totals.count) lines.push(`${fmtMoney(purchases.totals.amount)} was spent on ${fmt(purchases.totals.count)} stock purchase(s)${purchases.top_vendor ? `, most from ${purchases.top_vendor.name}` : ""}${purchases.totals.pending_count ? `; ${fmt(purchases.totals.pending_count)} still waiting to be received` : ""}.`);
          lines.push(`${fmt(d.new_clients.count)} new client(s) were added${rejected?.count ? `; ${fmt(rejected.count)} lead(s) were rejected, worth ${fmtMoney(rejected.lost_deal_value)} in deals` : ""}.`);
          if (out.total_challans || back.total_challans) lines.push(`${fmt(out.total_quantity)} units went out on ${fmt(out.total_challans)} challan(s)${out.goods_value ? ` (goods worth ${fmtMoney(out.goods_value)})` : ""}; ${fmt(back.total_received)} came back${back.total_lost + back.total_dead ? `, ${fmt(back.total_lost + back.total_dead)} lost or dead` : ""}.`);
          if (d.exhibitions.active.length) lines.push(`${fmt(d.exhibitions.active.length)} exhibition(s) were running this month.`);
        }

        return (
          <>
            <Summary lines={lines} />

            <Section title={`Money in · ${fmtMoney(cur.moneyIn)}`} description="Every payment received from clients this month, biggest first.">
              {payments.length === 0 ? (
                <p className="text-sm text-muted">No client payments this month.</p>
              ) : (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Client</th>
                        <th className={th}>Exhibition</th>
                        <th className={th}>Type</th>
                        <th className={`${th} text-right`}>Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {payments.map((p, i) => (
                        <tr key={i}>
                          <td className={`${td} text-muted`}>{fmtDate(p.date)}</td>
                          <td className={td}>
                            {p.company_name || p.client_name}
                            {p.company_name && <div className="text-xs text-muted">{p.client_name}</div>}
                          </td>
                          <td className={`${td} text-muted`}>{p.exhibition_name}</td>
                          <td className={`${td} text-muted`}>{p.amount < 0 ? "Correction" : p.field === "advance_payment" ? "Advance" : "Payment"}</td>
                          <td className={`${td} text-right tabular-nums font-medium`}>{fmtMoney(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Section>

            <Section title={`Money out · ${fmtMoney(cur.moneyOut)}`} description="Everyone who was paid this month, biggest first.">
              {payees.length === 0 ? (
                <p className="text-sm text-muted">No payments made this month.</p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-2 text-xs">
                    {(Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[]).map((cat) => (
                      <span key={cat} className="rounded-full border border-line bg-surface px-2.5 py-1">
                        {TYPE_LABEL[cat]}s <span className="font-semibold tabular-nums">{fmtMoney(d.expenses.by_category[cat].totals.paid)}</span>
                      </span>
                    ))}
                  </div>
                  <TableWrap>
                    <table className="w-full text-sm">
                      <thead className="border-b border-line bg-surface-2/50">
                        <tr>
                          <th className={th}>Paid to</th>
                          <th className={th}>Type</th>
                          <th className={th}>For</th>
                          <th className={`${th} text-right`}>Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {payees.map((p) => (
                          <tr key={`${p.type}-${p.id}`}>
                            <td className={`${td} font-medium`}>{p.name}</td>
                            <td className={`${td} text-muted`}>{p.type}</td>
                            <td className={`${td} max-w-72 truncate text-muted`} title={[...p.exhibitions, ...p.purposes.map((x) => x.purpose)].join(", ")}>
                              {p.exhibitions.join(", ") || "—"}
                              {p.purposes.length > 0 && <span className="text-xs"> · {p.purposes.map((x) => x.purpose).join(", ")}</span>}
                            </td>
                            <td className={`${td} text-right tabular-nums font-medium`}>{fmtMoney(p.paid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                </>
              )}
            </Section>

            <Section
              title={`Stock bought · ${fmtMoney(purchases?.totals.amount ?? 0)}`}
              description={`Purchases dated this month. ${fmt(purchases?.received_into_stock.count ?? 0)} purchase(s) (${fmt(purchases?.received_into_stock.units ?? 0)} units) were received into stock this month. Not part of profit.`}
            >
              {!purchases || purchases.purchases.length === 0 ? (
                <p className="text-sm text-muted">No purchases this month.</p>
              ) : (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Purchase</th>
                        <th className={th}>Date</th>
                        <th className={th}>Vendor</th>
                        <th className={th}>Bought by</th>
                        <th className={th}>Into</th>
                        <th className={`${th} text-right`}>Units</th>
                        <th className={`${th} text-right`}>Amount</th>
                        <th className={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {purchases.purchases.map((p) => (
                        <tr key={p.id}>
                          <td className={td}>
                            <Link href={`/modules/purchase/${p.id}`} className="font-medium hover:text-accent hover:underline">
                              {p.purchase_number}
                            </Link>
                          </td>
                          <td className={`${td} text-muted`}>{fmtDate(p.date)}</td>
                          <td className={td}>{p.vendor_name}</td>
                          <td className={`${td} text-muted`}>{p.purchased_by}</td>
                          <td className={`${td} text-muted`}>{p.warehouse_name}</td>
                          <td className={`${td} text-right tabular-nums`}>{fmt(p.units)}</td>
                          <td className={`${td} text-right tabular-nums font-medium`}>{fmtMoney(p.total_amount)}</td>
                          <td className={td}>{p.status === "received" ? <span className="text-xs font-medium text-success">Received</span> : <span className="text-xs font-medium text-warn">Waiting</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Section>

            <Section title="Clients and leads" description={`${fmt(d.new_clients.count)} new client(s) and ${fmt(rejected?.count ?? 0)} rejected lead(s) this month.`}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface p-3">
                  <h3 className="text-sm font-medium">New clients ({fmt(d.new_clients.count)})</h3>
                  {d.new_clients.clients.length === 0 ? (
                    <p className="mt-1 text-sm text-muted">None this month.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line text-sm">
                      {d.new_clients.clients.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                          <Link href={`/modules/client/${c.id}`} className="truncate hover:text-accent hover:underline">
                            {c.company || c.name}
                            {c.company && <span className="text-muted"> · {c.name}</span>}
                          </Link>
                          <span className="shrink-0 text-xs text-muted">{c.phone}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-xl border border-line bg-surface p-3">
                  <h3 className="text-sm font-medium">
                    Rejected leads ({fmt(rejected?.count ?? 0)}){rejected?.count ? <span className="font-normal text-muted"> · {fmtMoney(rejected.lost_deal_value)} lost</span> : null}
                  </h3>
                  {!rejected || rejected.leads.length === 0 ? (
                    <p className="mt-1 text-sm text-muted">None this month.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-line text-sm">
                      {rejected.leads.map((l) => (
                        <li key={l.id} className="py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <Link href={`/modules/client/${l.id}`} className="truncate font-medium hover:text-accent hover:underline">
                              {l.company || l.name}
                            </Link>
                            <span className="shrink-0 text-xs tabular-nums text-muted">{fmtMoney(l.lost_deal_value)}</span>
                          </div>
                          <p className="text-xs text-muted">
                            “{l.reason}” — {l.rejected_by ?? "someone"}, {fmtDate(l.rejected_at)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Goods movement" description="Challans to and from exhibitions this month.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface px-4 py-3">
                  <p className="text-xs font-medium text-muted">Sent out</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{fmt(out.total_quantity)} units</p>
                  <p className="text-xs text-muted">
                    {fmt(out.total_challans)} outgoing challan(s){out.goods_value ? ` · goods worth ${fmtMoney(out.goods_value)}` : ""}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-surface px-4 py-3">
                  <p className="text-xs font-medium text-muted">Came back</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{fmt(back.total_received)} units</p>
                  <p className="text-xs text-muted">
                    {fmt(back.total_challans)} incoming challan(s){back.total_lost + back.total_dead ? ` · ${fmt(back.total_lost)} lost, ${fmt(back.total_dead)} dead` : ""}
                  </p>
                </div>
              </div>
            </Section>

            <Section title={`Exhibitions running (${fmt(d.exhibitions.active.length)})`}>
              {d.exhibitions.active.length === 0 ? (
                <p className="text-sm text-muted">No exhibitions this month.</p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line bg-surface text-sm">
                  {d.exhibitions.active.map((e) => (
                    <li key={e._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                      <Link href={`/modules/reports/exhibitions/${e._id}`} className="font-medium hover:text-accent hover:underline">
                        {e.name}
                      </Link>
                      <span className="text-xs text-muted">
                        {fmtDate(e.startDate)} – {fmtDate(e.endDate)}
                        {e.venue ? ` · ${e.venue}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        );
      }}
    </QueryState>
  );
}
