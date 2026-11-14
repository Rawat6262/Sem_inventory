"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { upsertSalesTarget, useEmployeesMutation, type Employee, type UpsertSalesTargetInput } from "@/lib/employees";
import { MonthYearPicker } from "./month-year-picker";

type Props = { open: boolean; onClose: () => void; employee: Employee };

export function SalesTargetDialog({ open, onClose, employee }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`Add sales target — ${employee.name}`}>
      {open && <Form employee={employee} onDone={onClose} />}
    </Modal>
  );
}

function Form({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [target, setTarget] = useState("");
  const [remarks, setRemarks] = useState("");
  const save = useEmployeesMutation((input: UpsertSalesTargetInput) => upsertSalesTarget(input));

  const amt = Number(target);
  const valid = target !== "" && amt > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save.mutate({ employee: employee._id, month, year, target: amt, remarks: remarks.trim() || undefined }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">If this month already has a target, this amount is added to it rather than replacing it.</p>
      <Field label="Month">{() => <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />}</Field>
      <Field label="Target to add">{(id) => <Input id={id} type="number" inputMode="numeric" required min={1} value={target} onChange={(e) => setTarget(e.target.value)} />}</Field>
      <Field label="Remarks (optional)">{(id) => <Textarea id={id} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          Save target
        </Button>
      </div>
    </form>
  );
}
