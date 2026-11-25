"use client";

import { useMe } from "@/hooks/use-me";
import { mayDelete } from "@/lib/permissions";
import { CalendarDays, Mail, MapPin, Pencil, Phone, Plus, SearchX, Trash2, Wallet } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Paged } from "@/components/pagination";
import { Button } from "@/components/ui";
import { BackLink, EmptyState, QueryState, Section, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { ApiError } from "@/lib/api";
import {
  deleteVendor,
  fmtMoney,
  useVendor,
  useVendorsMutation,
  useVendorSummary,
} from "@/lib/vendors";
import { RecordVendorPaymentDialog } from "../_components/record-vendor-payment-dialog";
import { VendorDialog } from "../_components/vendor-dialog";

export function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const vendor = useVendor(id);
  const summary = useVendorSummary(id);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState<{ exhibitionId?: string } | null>(null);

  const remove = useVendorsMutation((vid: string) => deleteVendor(vid));
  const me = useMe().data;

  if (vendor.error instanceof ApiError && [400, 404].includes(vendor.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Vendor not found" action={<BackLink href="/modules/vendor">Back to vendors</BackLink>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  return (
    <QueryState queries={[vendor, summary]}>
      {() => {
        const v = vendor.data!;
        const sum = summary.data!;

        return (
          <>
            <BackLink href="/modules/vendor">← All vendors</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{v.vendorName}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium">{v.category}</span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {v.phoneNo}
                  </span>
                  {v.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3.5" aria-hidden />
                      {v.email}
                    </span>
                  )}
                  {v.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {v.address}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                {me && mayDelete(me, v.createdBy) && (
                  <Button variant="secondary" className="hover:text-danger" onClick={() => setDeleting(true)}>
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                )}
                <Button onClick={() => setPaying({})}>
                  <Wallet className="size-4" aria-hidden />
                  Record payment
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <StatTile label="Exhibitions" value={sum.byExhibition.length} />
              <StatTile label="Total paid" value={fmtMoney(sum.totals.total_amount)} tone="success" />
            </div>

            {sum.byExhibition.length === 0 ? (
              <div className="mt-8">
                <EmptyState icon={<CalendarDays className="size-6" />} title="No payments yet" action={<Button onClick={() => setPaying({})}>Record a payment</Button>}>
                  Recording a payment for an exhibition links this vendor to it automatically.
                </EmptyState>
              </div>
            ) : (
              <Section title="By exhibition" description="What was paid, and what each payment was for.">
                <Paged items={sum.byExhibition}>
                  {(pageRows) => (
                    <TableWrap>
                      <table className="w-full text-sm">
                        <thead className="border-b border-line bg-surface-2/50">
                          <tr>
                            <th className={th}>Exhibition</th>
                            <th className={th}>Purposes</th>
                            <th className={`${th} text-right`}>Paid</th>
                            <th className={th}>
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {pageRows.map((entry) => (
                            <tr key={entry.exhibition_id}>
                              <td className={`${td} font-medium`}>{entry.exhibition_name ?? "Exhibition"}</td>
                              <td className={td}>
                                {entry.purposes.length === 0 ? (
                                  <span className="text-muted">—</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {entry.purposes.map((p, i) => (
                                      <span key={i} className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs">
                                        {p.purpose} <span className="font-medium">{fmtMoney(p.amount)}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(entry.total_amount)}</td>
                              <td className={`${td} text-right`}>
                                <Button variant="ghost" className="h-8 px-2.5 text-accent hover:bg-accent-soft" onClick={() => setPaying({ exhibitionId: entry.exhibition_id })}>
                                  <Plus className="size-3.5" aria-hidden />
                                  Pay
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableWrap>
                  )}
                </Paged>
              </Section>
            )}

            {v.transactions && v.transactions.length > 0 && (
              <Section title="Recent payments">
                <Paged items={v.transactions}>
                  {(pageRows) => (
                    <TableWrap>
                      <table className="w-full text-sm">
                        <thead className="border-b border-line bg-surface-2/50">
                          <tr>
                            <th className={th}>Exhibition</th>
                            <th className={th}>Remark</th>
                            <th className={`${th} text-right`}>Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {pageRows.map((t) => (
                            <tr key={t._id}>
                              <td className={td}>{t.exhibition_name ?? "—"}</td>
                              <td className={`${td} text-muted`}>{t.remark}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(t.total_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableWrap>
                  )}
                </Paged>
              </Section>
            )}

            <VendorDialog open={editing} vendor={editing ? v : null} onClose={() => setEditing(false)} />

            <ConfirmDialog
              open={deleting}
              title={`Delete ${v.vendorName}?`}
              confirmLabel="Delete vendor"
              pending={remove.isPending}
              error={remove.error?.message}
              onClose={() => {
                setDeleting(false);
                remove.reset();
              }}
              onConfirm={() => remove.mutate(v._id, { onSuccess: () => router.push("/modules/vendor") })}
            >
              Any products pointing at this vendor will just show no vendor. This can&apos;t be undone.
            </ConfirmDialog>

            {paying && <RecordVendorPaymentDialog open onClose={() => setPaying(null)} vendorId={v._id} defaultExhibitionId={paying.exhibitionId} />}
          </>
        );
      }}
    </QueryState>
  );
}
