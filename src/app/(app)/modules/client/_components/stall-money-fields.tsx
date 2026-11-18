"use client";

import { Alert, Field, Input } from "@/components/ui";
import { fmtMoney } from "@/lib/clients";

export type StallMoney = { deal_amount: string; advance_payment: string; received_payment: string };

const num = (v: string) => Number(v || 0);

/** A stall can't be paid more than its deal amount (the backend refuses it too). */
export function stallOverpaid(m: StallMoney): boolean {
  return num(m.advance_payment) + num(m.received_payment) > num(m.deal_amount);
}

// Deal amount, advance and received, each payment capped at what's left of the deal.
export function StallMoneyFields({
  value,
  onChange,
  required = false,
}: {
  value: StallMoney;
  onChange: (key: keyof StallMoney, v: string) => void;
  required?: boolean;
}) {
  const deal = num(value.deal_amount);
  const advance = num(value.advance_payment);
  const received = num(value.received_payment);
  const overpaid = stallOverpaid(value);
  const advanceMax = Math.max(0, deal - received);
  const receivedMax = Math.max(0, deal - advance);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Deal amount">
          {(id) => (
            <Input id={id} type="number" inputMode="numeric" required={required} min={0} value={value.deal_amount} onChange={(e) => onChange("deal_amount", e.target.value)} />
          )}
        </Field>
        <Field label="Advance paid" hint={`Up to ${fmtMoney(advanceMax)}`}>
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              required={required}
              min={0}
              max={advanceMax}
              value={value.advance_payment}
              onChange={(e) => onChange("advance_payment", e.target.value)}
              aria-invalid={overpaid || undefined}
            />
          )}
        </Field>
        <Field label="Received" hint={`Up to ${fmtMoney(receivedMax)}`}>
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              required={required}
              min={0}
              max={receivedMax}
              value={value.received_payment}
              onChange={(e) => onChange("received_payment", e.target.value)}
              aria-invalid={overpaid || undefined}
            />
          )}
        </Field>
      </div>
      {overpaid && (
        <Alert>
          Total paid ({fmtMoney(advance + received)}) can&apos;t be more than the deal amount ({fmtMoney(deal)}). Lower the payments or raise the deal amount.
        </Alert>
      )}
    </>
  );
}
