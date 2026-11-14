"use client";

import { CalendarDays, MapPin, Pencil, Phone, Plus, Receipt, SearchX, Trash2, Wallet } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import { BackLink, EmptyNote, EmptyState, QueryState, Section, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { ApiError } from "@/lib/api";
import {
  deleteTransporter,
  fmt,
  fmtDate,
  fmtMoney,
  useTransportMutation,
  useTransporterSummary,
  useTransporters,
} from "@/lib/transport";
import { RecordTransportPaymentDialog } from "../_components/record-transport-payment-dialog";
import { TransporterDialog } from "../_components/transporter-dialog";
import { TripChargeDialog } from "../_components/trip-charge-dialog";

export function TransportDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const transporters = useTransporters(); // list already carries the full record + transaction history
  const summary = useTransporterSummary(id);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingTrip, setAddingTrip] = useState<{ exhibitionId?: string } | null>(null);
  const [paying, setPaying] = useState<{ exhibitionId?: string } | null>(null);

  const remove = useTransportMutation((tid: string) => deleteTransporter(tid));

  if (summary.error instanceof ApiError && [400, 404].includes(summary.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Transporter not found" action={<BackLink href="/modules/transport">Back to transport</BackLink>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  return (
    <QueryState queries={[transporters, summary]}>
      {() => {
        const t = transporters.data!.find((x) => x._id === id);
        const sum = summary.data!;

        if (!t) {
          return (
            <EmptyState icon={<SearchX className="size-6" />} title="Transporter not found" action={<BackLink href="/modules/transport">Back to transport</BackLink>}>
              It may have been deleted.
            </EmptyState>
          );
        }

        return (
          <>
            <BackLink href="/modules/transport">← All transporters</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t.transporter_name}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {t.phone_number}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {[t.address, t.city, t.state, t.country].filter(Boolean).join(", ")}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                <Button variant="secondary" className="hover:text-danger" onClick={() => setDeleting(true)}>
                  <Trash2 className="size-4" aria-hidden />
                  Delete
                </Button>
                <Button variant="secondary" onClick={() => setAddingTrip({})}>
                  <Receipt className="size-4" aria-hidden />
                  Add trip charge
                </Button>
                <Button onClick={() => setPaying({})}>
                  <Wallet className="size-4" aria-hidden />
                  Record payment
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Exhibitions" value={fmt(t.exhibition?.length ?? 0)} />
              <StatTile label="Agreed" value={fmtMoney(sum.totals.deal_amount)} />
              <StatTile label="Paid" value={fmtMoney(sum.totals.recorded_amount)} tone="success" />
              <StatTile label="Pending" value={fmtMoney(sum.totals.pending_amount)} tone={sum.totals.pending_amount > 0 ? "warn" : undefined} />
            </div>

            {sum.byExhibition.length === 0 ? (
              <div className="mt-8">
                <EmptyState icon={<CalendarDays className="size-6" />} title="No trips yet" action={<Button onClick={() => setAddingTrip({})}>Add a trip charge</Button>}>
                  Adding a trip charge or payment links this transporter to that exhibition automatically.
                </EmptyState>
              </div>
            ) : (
              sum.byExhibition.map((entry) => (
                <Section
                  key={entry.exhibition_id}
                  title={entry.exhibition_name ?? "Exhibition"}
                  description={`Agreed ${fmtMoney(entry.deal_amount)} · Paid ${fmtMoney(entry.recorded_amount)} · Pending ${fmtMoney(entry.pending_amount)}`}
                  action={
                    <div className="flex gap-2">
                      <Button variant="secondary" className="h-8 px-2.5" onClick={() => setAddingTrip({ exhibitionId: entry.exhibition_id })}>
                        <Plus className="size-3.5" aria-hidden />
                        Trip
                      </Button>
                      <Button variant="secondary" className="h-8 px-2.5" onClick={() => setPaying({ exhibitionId: entry.exhibition_id })}>
                        <Plus className="size-3.5" aria-hidden />
                        Payment
                      </Button>
                    </div>
                  }
                >
                  {entry.purposes.length === 0 ? (
                    <EmptyNote>No payments recorded yet.</EmptyNote>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {entry.purposes.map((p, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs">
                          {p.purpose}
                          <span className="font-medium tabular-nums">{fmtMoney(p.amount)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </Section>
              ))
            )}

            {t.transactions && t.transactions.length > 0 && (
              <Section title="Recent payments">
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Exhibition</th>
                        <th className={th}>Vehicle</th>
                        <th className={th}>Remark</th>
                        <th className={`${th} text-right`}>Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {t.transactions.map((txn) => (
                        <tr key={txn._id}>
                          <td className={`${td} text-muted`}>{fmtDate(txn.transaction_date)}</td>
                          <td className={td}>{txn.exhibition_name ?? "—"}</td>
                          <td className={`${td} text-muted`}>{txn.vehicle_number ?? "—"}</td>
                          <td className={`${td} text-muted`}>{txn.remark}</td>
                          <td className={`${td} text-right tabular-nums`}>{fmtMoney(txn.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </Section>
            )}

            <TransporterDialog open={editing} transporter={editing ? t : null} onClose={() => setEditing(false)} />

            <ConfirmDialog
              open={deleting}
              title={`Delete ${t.transporter_name}?`}
              confirmLabel="Delete transporter"
              pending={remove.isPending}
              error={remove.error?.message}
              onClose={() => {
                setDeleting(false);
                remove.reset();
              }}
              onConfirm={() => remove.mutate(t._id, { onSuccess: () => router.push("/modules/transport") })}
            >
              Their trip charges and payment history stay on record. This can&apos;t be undone.
            </ConfirmDialog>

            {addingTrip && <TripChargeDialog open onClose={() => setAddingTrip(null)} transporterId={t._id} defaultExhibitionId={addingTrip.exhibitionId} />}
            {paying && <RecordTransportPaymentDialog open onClose={() => setPaying(null)} transporterId={t._id} defaultExhibitionId={paying.exhibitionId} />}
          </>
        );
      }}
    </QueryState>
  );
}
