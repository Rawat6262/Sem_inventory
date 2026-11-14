"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { fmtMoney, personName, recordStallPayment, useContractorsMutation, type Stall } from "@/lib/contractors";

type Props = { open: boolean; onClose: () => void; labourId: string; exhibitionId: string; stall: Stall | null };

export function StallPaymentDialog({ open, onClose, labourId, exhibitionId, stall }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={stall ? `Record payment — ${stall.stall_name || stall.stall_no || "Stall"}` : "Record payment"}>
      {open && stall && <StallPaymentForm labourId={labourId} exhibitionId={exhibitionId} stall={stall} onDone={onClose} />}
    </Modal>
  );
}

function StallPaymentForm({ labourId, exhibitionId, stall, onDone }: { labourId: string; exhibitionId: string; stall: Stall; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const pay = useContractorsMutation(recordStallPayment);

  const max = stall.remaining_amount;
  const amt = Number(amount);
  const invalid = amount !== "" && (amt <= 0 || amt > max);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || !amount) return;
    pay.mutate(
      {
        exhibition: exhibitionId,
        labour: labourId,
        stall: stall._id,
        purposes: [{ purpose: "labour", amount: amt }],
        remark: remark.trim() || `Payment to ${personName(stall.person, stall.person_name)} for stall ${stall.stall_name || stall.stall_no || ""}`,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-surface-2/60 py-2">
          <dt className="text-xs text-muted">Agreed</dt>
          <dd className="font-semibold tabular-nums">{fmtMoney(stall.agreement_amount)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2/60 py-2">
          <dt className="text-xs text-muted">Paid</dt>
          <dd className="font-semibold tabular-nums text-success">{fmtMoney(stall.paid_amount)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2/60 py-2">
          <dt className="text-xs text-muted">Remaining</dt>
          <dd className="font-semibold tabular-nums text-warn">{fmtMoney(max)}</dd>
        </div>
      </dl>

      <Field label="Amount to pay now" hint={`Up to ${fmtMoney(max)}`}>
        {(id) => (
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={max}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
      {invalid && <p className="-mt-2 text-sm text-danger">Enter an amount from ₹1 to {fmtMoney(max)}.</p>}

      <Field label="Remark (optional)">{(id) => <Textarea id={id} rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />}</Field>

      {pay.error && <Alert>{pay.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={pay.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={pay.isPending} disabled={invalid || !amount}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
