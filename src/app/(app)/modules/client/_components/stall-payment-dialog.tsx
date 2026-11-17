"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { fmtMoney, updateClientPayment, useClientsMutation, type ClientStall } from "@/lib/clients";

type Props = { open: boolean; onClose: () => void; clientId: string; exhibitionId: string; stall: ClientStall | null };

export function StallPaymentDialog({ open, onClose, clientId, exhibitionId, stall }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={stall ? `Update payment — ${stall.stall_name || stall.stall_no || "Stall"}` : "Update payment"}>
      {open && stall && <PaymentForm clientId={clientId} exhibitionId={exhibitionId} stall={stall} onDone={onClose} />}
    </Modal>
  );
}

function PaymentForm({ clientId, exhibitionId, stall, onDone }: { clientId: string; exhibitionId: string; stall: ClientStall; onDone: () => void }) {
  const [form, setForm] = useState({
    deal_amount: String(stall.deal_amount),
    advance_payment: String(stall.advance_payment),
    received_payment: String(stall.received_payment),
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useClientsMutation(updateClientPayment);

  const dealAmount = Number(form.deal_amount || 0);
  const advance = Number(form.advance_payment || 0);
  const received = Number(form.received_payment || 0);
  const totalPaid = advance + received;
  const remaining = dealAmount - totalPaid;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      { clientId, exhibitionId, stallId: stall._id, deal_amount: dealAmount, advance_payment: advance, received_payment: received },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-xs text-muted">These fields set the totals directly — they don&apos;t add to the existing amount.</p>
      <Field label="Deal amount">
        {(id) => <Input id={id} type="number" inputMode="numeric" required min={0} value={form.deal_amount} onChange={(e) => set("deal_amount")(e.target.value)} />}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Advance paid">
          {(id) => <Input id={id} type="number" inputMode="numeric" required min={0} value={form.advance_payment} onChange={(e) => set("advance_payment")(e.target.value)} />}
        </Field>
        <Field label="Received">
          {(id) => <Input id={id} type="number" inputMode="numeric" required min={0} value={form.received_payment} onChange={(e) => set("received_payment")(e.target.value)} />}
        </Field>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-lg bg-surface-2/60 py-2">
          <dt className="text-xs text-muted">Total paid</dt>
          <dd className="font-semibold tabular-nums text-success">{fmtMoney(totalPaid)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2/60 py-2">
          <dt className="text-xs text-muted">Remaining</dt>
          <dd className={`font-semibold tabular-nums ${remaining > 0 ? "text-warn" : ""}`}>{fmtMoney(remaining)}</dd>
        </div>
      </dl>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
