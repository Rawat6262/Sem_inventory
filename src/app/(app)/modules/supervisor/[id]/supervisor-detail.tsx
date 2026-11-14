"use client";

import { CalendarDays, Lock, Mail, Phone, Plus, Receipt, SearchX, Wallet } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { BackLink, EmptyNote, EmptyState, QueryState, Section, StatTile } from "@/components/data-ui";
import { ApiError } from "@/lib/api";
import {
  fmtMoney,
  supervisorPaidTotal,
  useSupervisor,
  useSupervisorSummary,
} from "@/lib/supervisors";
import { AddExpenseDialog } from "../_components/add-expense-dialog";
import { RecordPaymentDialog } from "../_components/record-payment-dialog";

export function SupervisorDetail() {
  const { id } = useParams<{ id: string }>();
  const supervisor = useSupervisor(id);
  const summary = useSupervisorSummary(id);

  const [paying, setPaying] = useState<{ exhibitionId?: string } | null>(null);
  const [addingExpense, setAddingExpense] = useState<{ exhibitionId?: string } | null>(null);

  if (supervisor.error instanceof ApiError && supervisor.error.status === 403) {
    return (
      <EmptyState icon={<Lock className="size-6" />} title="You can only view your own record">
        Ask an admin if you need to see another supervisor.
      </EmptyState>
    );
  }
  if (supervisor.error instanceof ApiError && [400, 404].includes(supervisor.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Supervisor not found" action={<BackLink href="/modules/supervisor">Back to supervisors</BackLink>}>
        They may no longer be approved, or the link is wrong.
      </EmptyState>
    );
  }

  return (
    <QueryState queries={[supervisor, summary]}>
      {() => {
        const s = supervisor.data!;
        const sum = summary.data!;

        return (
          <>
            <BackLink href="/modules/supervisor">← All supervisors</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{s.full_name}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3.5" aria-hidden />
                    {s.gmail}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {s.mobile_number}
                  </span>
                  {!s.isapproved && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">Not yet approved</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setAddingExpense({})}>
                  <Receipt className="size-4" aria-hidden />
                  Record expense
                </Button>
                <Button onClick={() => setPaying({})}>
                  <Wallet className="size-4" aria-hidden />
                  Record payment
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Exhibitions" value={s.exhibition?.length ?? 0} />
              <StatTile label="Paid" value={fmtMoney(supervisorPaidTotal(s))} tone="success" />
              <StatTile label="Expenses recorded" value={fmtMoney(sum.totals.expense_amount)} />
              <StatTile
                label="Balance"
                value={fmtMoney(sum.totals.pending_amount)}
                tone={sum.totals.pending_amount > 0 ? "warn" : undefined}
                hint="Paid minus expenses recorded"
              />
            </div>

            {sum.byExhibition.length === 0 ? (
              <div className="mt-8">
                <EmptyState icon={<CalendarDays className="size-6" />} title="No exhibitions yet" action={<Button onClick={() => setPaying({})}>Record a payment</Button>}>
                  Recording a payment or expense for an exhibition links this supervisor to it automatically.
                </EmptyState>
              </div>
            ) : (
              sum.byExhibition.map((entry) => (
                <Section
                  key={entry.exhibition_id}
                  title={entry.exhibition_name ?? "Exhibition"}
                  description={`Paid ${fmtMoney(entry.deal_amount)} · Expenses ${fmtMoney(entry.expense_amount)} · Balance ${fmtMoney(entry.pending_amount)}`}
                  action={
                    <div className="flex gap-2">
                      <Button variant="secondary" className="h-8 px-2.5" onClick={() => setAddingExpense({ exhibitionId: entry.exhibition_id })}>
                        <Plus className="size-3.5" aria-hidden />
                        Expense
                      </Button>
                      <Button variant="secondary" className="h-8 px-2.5" onClick={() => setPaying({ exhibitionId: entry.exhibition_id })}>
                        <Plus className="size-3.5" aria-hidden />
                        Payment
                      </Button>
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted">Paid (by purpose)</h3>
                      {entry.purposes.length === 0 ? (
                        <EmptyNote>No payments recorded.</EmptyNote>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {entry.purposes.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs">
                              <Wallet className="size-3 text-success" aria-hidden />
                              {p.purpose}
                              <span className="font-medium tabular-nums">{fmtMoney(p.amount)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted">Expenses recorded</h3>
                      {entry.expense_purposes.length === 0 ? (
                        <EmptyNote>No expenses recorded.</EmptyNote>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {entry.expense_purposes.map((p, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs">
                              <Receipt className="size-3 text-muted" aria-hidden />
                              {p.purpose}
                              <span className="font-medium tabular-nums">{fmtMoney(p.amount)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Section>
              ))
            )}

            {paying && <RecordPaymentDialog open onClose={() => setPaying(null)} supervisorId={s._id} defaultExhibitionId={paying.exhibitionId} />}
            {addingExpense && (
              <AddExpenseDialog open onClose={() => setAddingExpense(null)} supervisorId={s._id} defaultExhibitionId={addingExpense.exhibitionId} />
            )}
          </>
        );
      }}
    </QueryState>
  );
}
