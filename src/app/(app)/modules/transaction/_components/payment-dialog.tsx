"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { addPayment, CATEGORY_LABELS, entityName, fmtMoney, PAYMENT_MODES, useTransactionsMutation, type AddPaymentInput, type PaymentMode, type Transaction } from "@/lib/transactions";

type Props = { open: boolean; onClose: () => void; transaction: Transaction };

export function PaymentDialog({ open, onClose, transaction }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`Record payment — ${entityName(transaction)}`} description={CATEGORY_LABELS[transaction.category]}>
      {open && <PaymentForm transaction={transaction} onDone={onClose} />}
    </Modal>
  );
}

function PaymentForm({ transaction, onDone }: { transaction: Transaction; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>((transaction.payment_mode as PaymentMode) ?? "cash");
  const pay = useTransactionsMutation((input: AddPaymentInput) => addPayment(input));

  const max = transaction.pending_amount;
  const amt = Number(amount);
  const invalid = amount !== "" && (amt <= 0 || amt > max);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || !amount) return;
    pay.mutate({ id: transaction._id, amount: amt, payment_mode: paymentMode }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-surface-2/60 py-2">
          <dt className="text-xs text-muted">Total</dt>
          <dd className="font-semibold tabular-nums">{fmtMoney(transaction.total_amount)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2/60 py-2">
          <dt className="text-xs text-muted">Paid</dt>
          <dd className="font-semibold tabular-nums text-success">{fmtMoney(transaction.paid_amount)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2/60 py-2">
          <dt className="text-xs text-muted">Pending</dt>
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

      <Field label="Payment mode">
        {(id) => (
          <Select id={id} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        )}
      </Field>

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
