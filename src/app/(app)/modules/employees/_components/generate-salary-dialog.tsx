"use client";

import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { Modal } from "@/components/modal";
import { fmt, fmtMoney, generateSalary, useEmployeesMutation, type Employee, type GenerateSalaryInput } from "@/lib/employees";
import { MonthYearPicker } from "./month-year-picker";

type GenerateResult = {
  employee: { current_salary: number };
  salary: { base_salary: number; per_day_salary?: number; leave_count?: number; leave_deduction: number; increment: number; final_salary: number };
};

type Props = { open: boolean; onClose: () => void; employee: Employee };

export function GenerateSalaryDialog({ open, onClose, employee }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`Generate salary — ${employee.name}`}>
      {open && <GenerateForm employee={employee} onDone={onClose} />}
    </Modal>
  );
}

function GenerateForm({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [increment, setIncrement] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const save = useEmployeesMutation((input: GenerateSalaryInput) => generateSalary(input));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      { employeeId: employee._id, month, year, increment: increment.trim() ? Number(increment) : undefined },
      { onSuccess: (res) => setResult((res as { data: GenerateResult }).data) },
    );
  }

  if (result) {
    const s = result.salary;
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">Salary generated for {month}/{year}.</Alert>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Row label="Base salary" value={fmtMoney(s.base_salary)} />
          {s.leave_count !== undefined && <Row label="Leave days" value={fmt(s.leave_count)} />}
          {s.per_day_salary !== undefined && <Row label="Per-day rate" value={fmtMoney(s.per_day_salary)} />}
          <Row label="Leave deduction" value={fmtMoney(s.leave_deduction)} tone="danger" />
          <Row label="Increment" value={fmtMoney(s.increment)} tone={s.increment > 0 ? "success" : undefined} />
          <Row label="Final salary" value={fmtMoney(s.final_salary)} bold />
        </dl>
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">Leave taken that month is deducted automatically, at base salary ÷ 26 per day.</p>
      <Field label="Month">{() => <MonthYearPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />}</Field>
      <Field label="Increment this month (optional)">{(id) => <Input id={id} type="number" inputMode="numeric" min={0} value={increment} onChange={(e) => setIncrement(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Generate
        </Button>
      </div>
    </form>
  );
}

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: "danger" | "success"; bold?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-2/60 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`tabular-nums ${bold ? "font-semibold" : "font-medium"} ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : ""}`}>{value}</dd>
    </div>
  );
}
