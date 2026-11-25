"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import {
  addFinanceVendorPayment,
  fmtMoney,
  updateFinanceVendorPayment,
  useFinanceVendorsMutation,
  type PaymentEntry,
  type VendorPaymentInput,
} from "@/lib/finance-vendors";

type Props = {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  remainingBalance: number;
  payment?: PaymentEntry | null; // correct this one when set, record a new one otherwise
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function VendorPaymentDialog({ open, onClose, vendorId, remainingBalance, payment }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={payment ? "Correct a GST payment" : "Record a GST payment"}>
      {open && <PaymentForm key={payment?._id ?? "new"} vendorId={vendorId} remainingBalance={remainingBalance} payment={payment} onDone={onClose} />}
    </Modal>
  );
}

function PaymentForm({ vendorId, remainingBalance, payment, onDone }: Omit<Props, "open" | "onClose"> & { onDone: () => void }) {
  const [amount, setAmount] = useState(payment ? String(payment.paidAmount) : "");
  const [date, setDate] = useState(payment ? payment.paidDate.slice(0, 10) : today());
  const pay = useFinanceVendorsMutation((input: VendorPaymentInput) =>
    payment ? updateFinanceVendorPayment({ ...input, paymentId: payment._id }) : addFinanceVendorPayment(input),
  );

  // A payment being corrected frees its own amount first.
  const max = Math.round((remainingBalance + (payment?.paidAmount ?? 0)) * 100) / 100;
  const amt = Number(amount);
  const invalid = amount !== "" && (amt <= 0 || amt > max);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || !amount) return;
    pay.mutate({ vendorId, paidAmount: amt, paidDate: date }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
        {payment ? "Remaining GST balance without this payment" : "Remaining GST balance"}:{" "}
        <span className="font-semibold tabular-nums">{fmtMoney(max)}</span>
      </div>
      <Field label={payment ? "Amount paid" : "Amount to pay"} hint={`Up to ${fmtMoney(max)}`}>
        {(id) => (
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            required
            min={0.01}
            step={0.01}
            max={max}
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
      {invalid && <p className="-mt-2 text-sm text-danger">Enter an amount above ₹0, up to {fmtMoney(max)}.</p>}
      <Field label="Date">{(id) => <Input id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>

      {pay.error && <Alert>{pay.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={pay.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={pay.isPending} disabled={invalid || !amount || !date || max <= 0}>
          {payment ? "Save correction" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
