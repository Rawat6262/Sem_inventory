"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { addFinanceVendorPayment, fmtMoney, useFinanceVendorsMutation, type VendorPaymentInput } from "@/lib/finance-vendors";

type Props = { open: boolean; onClose: () => void; vendorId: string; remainingBalance: number };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function VendorPaymentDialog({ open, onClose, vendorId, remainingBalance }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Record a GST payment">
      {open && <PaymentForm vendorId={vendorId} remainingBalance={remainingBalance} onDone={onClose} />}
    </Modal>
  );
}

function PaymentForm({ vendorId, remainingBalance, onDone }: { vendorId: string; remainingBalance: number; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const pay = useFinanceVendorsMutation((input: VendorPaymentInput) => addFinanceVendorPayment(input));

  const amt = Number(amount);
  const invalid = amount !== "" && (amt <= 0 || amt > remainingBalance);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || !amount) return;
    pay.mutate({ vendorId, paidAmount: amt, paidDate: date }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
        Remaining GST balance: <span className="font-semibold tabular-nums">{fmtMoney(remainingBalance)}</span>
      </div>
      <Field label="Amount to pay" hint={`Up to ${fmtMoney(remainingBalance)}`}>
        {(id) => (
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={remainingBalance}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
      {invalid && <p className="-mt-2 text-sm text-danger">Enter an amount from ₹1 to {fmtMoney(remainingBalance)}.</p>}
      <Field label="Date">{(id) => <Input id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>

      {pay.error && <Alert>{pay.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={pay.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={pay.isPending} disabled={invalid || !amount || remainingBalance <= 0}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
