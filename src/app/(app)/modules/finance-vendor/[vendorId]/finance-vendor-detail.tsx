"use client";

import { Pencil, Plus, Receipt, SearchX, Trash2, Wallet } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import { BackLink, EmptyNote, EmptyState, QueryState, Section, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";
import {
  deleteFinanceVendorPayment,
  deleteTaxableEntry,
  fmtDate,
  fmtMoney,
  useFinanceVendorDetails,
  useFinanceVendorsMutation,
  type PaymentEntry,
  type TaxableEntry,
} from "@/lib/finance-vendors";
import { mayDelete } from "@/lib/permissions";
import { TaxableEntryDialog } from "../_components/taxable-entry-dialog";
import { VendorPaymentDialog } from "../_components/vendor-payment-dialog";

export function FinanceVendorDetail() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const details = useFinanceVendorDetails(vendorId);

  const [addingEntry, setAddingEntry] = useState(false);
  const [paying, setPaying] = useState(false);
  const [correcting, setCorrecting] = useState<PaymentEntry | null>(null);
  const [deleting, setDeleting] = useState<PaymentEntry | null>(null);
  const [correctingEntry, setCorrectingEntry] = useState<TaxableEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<TaxableEntry | null>(null);
  const me = useMe().data;
  const removeEntry = useFinanceVendorsMutation(deleteTaxableEntry);
  const remove = useFinanceVendorsMutation(deleteFinanceVendorPayment);

  if (details.error instanceof ApiError && [400, 404].includes(details.error.status)) {
    return (
      <>
        <BackLink href="/modules/finance-vendor">← All finance vendors</BackLink>
        <div className="mt-6">
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="No GST ledger for this vendor"
            action={
              <Button onClick={() => setAddingEntry(true)}>
                <Plus className="size-4" aria-hidden />
                Add the first taxable entry
              </Button>
            }
          >
            Add a taxable amount to start a ledger for them.
          </EmptyState>
        </div>
        <TaxableEntryDialog open={addingEntry} onClose={() => setAddingEntry(false)} vendorId={vendorId} />
      </>
    );
  }

  return (
    <QueryState queries={[details]}>
      {() => {
        const d = details.data!;

        return (
          <>
            <BackLink href="/modules/finance-vendor">← All finance vendors</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{d.vendor?.vendorName ?? "Deleted vendor"}</h2>
                {d.vendor?.category && <p className="mt-1 text-sm text-muted">{d.vendor.category}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setAddingEntry(true)}>
                  <Receipt className="size-4" aria-hidden />
                  Add taxable entry
                </Button>
                <Button onClick={() => setPaying(true)} disabled={d.summary.remainingBalance <= 0}>
                  <Wallet className="size-4" aria-hidden />
                  Record payment
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Taxable amount" value={fmtMoney(d.summary.taxableAmount)} />
              <StatTile label="GST payable" value={fmtMoney(d.summary.gstBalance)} />
              <StatTile label="Paid" value={fmtMoney(d.summary.paidAmount)} tone="success" />
              <StatTile label="Remaining" value={fmtMoney(d.summary.remainingBalance)} tone={d.summary.remainingBalance > 0 ? "warn" : undefined} />
            </div>

            <Section title="Taxable entries" description="Every invoice amount and GST rate added to this ledger.">
              {d.taxableHistory.length === 0 ? (
                <EmptyNote>No taxable entries yet.</EmptyNote>
              ) : (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Date</th>
                        <th className={`${th} text-right`}>Taxable amount</th>
                        <th className={`${th} text-right`}>Rate</th>
                        <th className={`${th} text-right`}>GST</th>
                        <th className={th}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...d.taxableHistory].reverse().map((e) => (
                        <tr key={e._id}>
                          <td className={`${td} text-muted`}>{fmtDate(e.date)}</td>
                          <td className={`${td} text-right tabular-nums`}>{fmtMoney(e.taxableAmount)}</td>
                          <td className={`${td} text-right tabular-nums`}>{e.rate}%</td>
                          <td className={`${td} text-right tabular-nums font-medium`}>{fmtMoney(e.gst)}</td>
                          <td className={`${td} text-right`}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" className="h-8 px-2" onClick={() => setCorrectingEntry(e)} aria-label={`Correct entry of ${fmtMoney(e.taxableAmount)}`}>
                                <Pencil className="size-3.5" aria-hidden />
                              </Button>
                              {me && mayDelete(me, e.createdBy) && (
                                <Button
                                  variant="ghost"
                                  className="h-8 px-2 hover:text-danger"
                                  onClick={() => setDeletingEntry(e)}
                                  aria-label={`Delete entry of ${fmtMoney(e.taxableAmount)}`}
                                >
                                  <Trash2 className="size-3.5" aria-hidden />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Section>

            <Section title="Payments" description="Every GST payment recorded against this ledger.">
              {d.paymentHistory.length === 0 ? (
                <EmptyNote>No payments yet.</EmptyNote>
              ) : (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Date</th>
                        <th className={`${th} text-right`}>Amount</th>
                        <th className={th}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...d.paymentHistory].reverse().map((p) => (
                        <tr key={p._id}>
                          <td className={`${td} text-muted`}>{fmtDate(p.paidDate)}</td>
                          <td className={`${td} text-right tabular-nums font-medium text-success`}>{fmtMoney(p.paidAmount)}</td>
                          <td className={`${td} text-right`}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" className="h-8 px-2" onClick={() => setCorrecting(p)} aria-label={`Correct payment of ${fmtMoney(p.paidAmount)}`}>
                                <Pencil className="size-3.5" aria-hidden />
                              </Button>
                              {me && mayDelete(me, p.createdBy) && (
                                <Button
                                  variant="ghost"
                                  className="h-8 px-2 hover:text-danger"
                                  onClick={() => setDeleting(p)}
                                  aria-label={`Delete payment of ${fmtMoney(p.paidAmount)}`}
                                >
                                  <Trash2 className="size-3.5" aria-hidden />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Section>

            <TaxableEntryDialog
              open={addingEntry || Boolean(correctingEntry)}
              onClose={() => {
                setAddingEntry(false);
                setCorrectingEntry(null);
              }}
              vendorId={vendorId}
              vendorName={d.vendor?.vendorName}
              entry={correctingEntry}
            />
            <ConfirmDialog
              open={Boolean(deletingEntry)}
              title={`Delete this taxable entry of ${fmtMoney(deletingEntry?.taxableAmount)}?`}
              confirmLabel="Delete entry"
              pending={removeEntry.isPending}
              error={removeEntry.error?.message}
              onClose={() => {
                setDeletingEntry(null);
                removeEntry.reset();
              }}
              onConfirm={() => deletingEntry && removeEntry.mutate({ vendorId, entryId: deletingEntry._id }, { onSuccess: () => setDeletingEntry(null) })}
            >
              {d.taxableHistory.length === 1 && d.paymentHistory.length === 0
                ? "It's the only entry, so this vendor's GST ledger is deleted too."
                : `Its GST of ${fmtMoney(deletingEntry?.gst)} is taken off the GST payable.`}{" "}
              This can&apos;t be undone.
            </ConfirmDialog>
            <VendorPaymentDialog
              open={paying || Boolean(correcting)}
              onClose={() => {
                setPaying(false);
                setCorrecting(null);
              }}
              vendorId={vendorId}
              remainingBalance={d.summary.remainingBalance}
              payment={correcting}
            />
            <ConfirmDialog
              open={Boolean(deleting)}
              title={`Delete this payment of ${fmtMoney(deleting?.paidAmount)}?`}
              confirmLabel="Delete payment"
              pending={remove.isPending}
              error={remove.error?.message}
              onClose={() => {
                setDeleting(null);
                remove.reset();
              }}
              onConfirm={() => deleting && remove.mutate({ vendorId, paymentId: deleting._id }, { onSuccess: () => setDeleting(null) })}
            >
              Paid on {fmtDate(deleting?.paidDate)}. Its amount goes back to the remaining GST balance. This can&apos;t be undone.
            </ConfirmDialog>
          </>
        );
      }}
    </QueryState>
  );
}
