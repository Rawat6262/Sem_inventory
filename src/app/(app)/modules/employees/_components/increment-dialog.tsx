"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { fmtMoney, giveIncrement, useEmployeesMutation, type Employee } from "@/lib/employees";

type Props = { open: boolean; onClose: () => void; employee: Employee };

export function IncrementDialog({ open, onClose, employee }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`Give increment — ${employee.name}`}>
      {open && <IncrementForm employee={employee} onDone={onClose} />}
    </Modal>
  );
}

function IncrementForm({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const save = useEmployeesMutation(giveIncrement);

  const amt = Number(amount);
  const valid = amount !== "" && amt > 0;
  const current = employee.current_salary ?? 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save.mutate({ employeeId: employee._id, increment: amt }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Current salary: <span className="font-medium text-ink">{fmtMoney(current)}</span>. This is recorded in their increment history.
      </p>
      <Field label="Increment amount">{(id) => <Input id={id} type="number" inputMode="numeric" required min={1} autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
      {amt > 0 && (
        <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
          New salary: <span className="font-semibold tabular-nums">{fmtMoney(current + amt)}</span>
        </div>
      )}
      {save.error && <Alert>{save.error.message}</Alert>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          Give increment
        </Button>
      </div>
    </form>
  );
}
