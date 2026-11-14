"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { addLeaveDate, LEAVE_TYPES, useEmployeesMutation, type AddLeaveInput, type LeaveType } from "@/lib/employees";

type Props = { open: boolean; onClose: () => void; employeeId: string; month: number; year: number };

function defaultDate(month: number, year: number) {
  const today = new Date();
  if (today.getMonth() + 1 === month && today.getFullYear() === year) return today.toISOString().slice(0, 10);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function LeaveDialog({ open, onClose, employeeId, month, year }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Add leave date">
      {open && <LeaveForm employeeId={employeeId} month={month} year={year} onDone={onClose} />}
    </Modal>
  );
}

function LeaveForm({ employeeId, month, year, onDone }: { employeeId: string; month: number; year: number; onDone: () => void }) {
  const [date, setDate] = useState(defaultDate(month, year));
  const [leaveType, setLeaveType] = useState<LeaveType>("unpaid");
  const [reason, setReason] = useState("");
  const save = useEmployeesMutation((input: AddLeaveInput) => addLeaveDate(input));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({ employeeId, month, year, date, leave_type: leaveType, reason: reason.trim() || undefined }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Adds one date to this employee&apos;s leave record for that month. Add again for another date.
      </p>
      <Field label="Date">{(id) => <Input id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
      <Field label="Leave type">
        {(id) => (
          <Select id={id} value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)}>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Reason (optional)">{(id) => <Textarea id={id} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Add leave date
        </Button>
      </div>
    </form>
  );
}
