"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { fmtMoney, recordSupervisorPayment, useExhibitionsList, useSupervisorsMutation, type SupervisorPaymentInput } from "@/lib/supervisors";

type Props = { open: boolean; onClose: () => void; supervisorId: string; defaultExhibitionId?: string };

const COMMON_PURPOSES = ["travel", "food", "Misc", "material"];

export function RecordPaymentDialog({ open, onClose, supervisorId, defaultExhibitionId }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Record a payment">
      {open && <PaymentForm supervisorId={supervisorId} defaultExhibitionId={defaultExhibitionId} onDone={onClose} />}
    </Modal>
  );
}

function PaymentForm({ supervisorId, defaultExhibitionId, onDone }: { supervisorId: string; defaultExhibitionId?: string; onDone: () => void }) {
  const exhibitions = useExhibitionsList();
  const [exhibitionId, setExhibitionId] = useState(defaultExhibitionId ?? "");
  const [purpose, setPurpose] = useState("travel");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const pay = useSupervisorsMutation((input: SupervisorPaymentInput) => recordSupervisorPayment(input));

  const amt = Number(amount);
  const valid = Boolean(exhibitionId) && purpose.trim() && amt > 0 && remark.trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    pay.mutate(
      { exhibition: exhibitionId, supervisor: supervisorId, purposes: [{ purpose: purpose.trim(), amount: amt }], remark: remark.trim() },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Exhibition">
        {(id) => (
          <Select id={id} required value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} disabled={exhibitions.isPending || Boolean(defaultExhibitionId)}>
            <option value="">{exhibitions.isPending ? "Loading…" : "Select exhibition"}</option>
            {exhibitions.data?.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.name}
                {ex.city ? ` — ${ex.city}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Purpose">{(id) => <Input id={id} required list="payment-purposes" value={purpose} onChange={(e) => setPurpose(e.target.value)} />}</Field>
        <Field label="Amount">{(id) => <Input id={id} type="number" inputMode="numeric" required min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
      </div>
      <datalist id="payment-purposes">
        {COMMON_PURPOSES.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <Field label="Remark">{(id) => <Textarea id={id} required rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="What was this for?" />}</Field>

      {amt > 0 && <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">Paying {fmtMoney(amt)}</div>}
      {pay.error && <Alert>{pay.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={pay.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={pay.isPending} disabled={!valid}>
          Record payment
        </Button>
      </div>
    </form>
  );
}
