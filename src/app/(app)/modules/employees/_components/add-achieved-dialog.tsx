"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { addAchieved, useEmployeesMutation, type AddAchievedInput, type Employee } from "@/lib/employees";
import { MonthYearPicker } from "./month-year-picker";

type Props = { open: boolean; onClose: () => void; employee: Employee };

export function AddAchievedDialog({ open, onClose, employee }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`Add achieved — ${employee.name}`}>
      {open && <Form employee={employee} onDone={onClose} />}
    </Modal>
  );
}

function Form({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [achieved, setAchieved] = useState("");
  const save = useEmployeesMutation((input: AddAchievedInput) => addAchieved(input));

  const amt = Number(achieved);
  const valid = achieved !== "" && amt > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save.mutate({ employee: employee._id, month, year, achieved: amt }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">Adds to what&apos;s already achieved this month. A target must already exist for this month.</p>
      <Field label="Month">{() => <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />}</Field>
      <Field label="Amount to add">{(id) => <Input id={id} type="number" inputMode="numeric" required min={1} autoFocus value={achieved} onChange={(e) => setAchieved(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          Add achieved
        </Button>
      </div>
    </form>
  );
}
