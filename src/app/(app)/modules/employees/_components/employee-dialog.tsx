"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { EMPLOYEE_STATUSES, GENDERS, saveEmployee, useEmployeesMutation, type Employee, type EmployeeInput } from "@/lib/employees";

type Props = { open: boolean; onClose: () => void; employee?: Employee | null };

export function EmployeeDialog({ open, onClose, employee }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={employee ? "Edit employee" : "Add employee"}>
      {open && <EmployeeForm key={employee?._id ?? "new"} employee={employee} onDone={onClose} />}
    </Modal>
  );
}

function fileRef(f: FileList | null): File | null {
  return f && f.length > 0 ? f[0] : null;
}

function EmployeeForm({ employee, onDone }: { employee?: Employee | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: employee?.name ?? "",
    phone: employee?.phone ?? "",
    email: employee?.email ?? "",
    gender: employee?.gender ?? "",
    joining_date: employee?.joining_date ? employee.joining_date.slice(0, 10) : "",
    company: employee?.company ?? "",
    current_salary: employee?.current_salary != null ? String(employee.current_salary) : "",
    status: employee?.status ?? "active",
    bank_name: employee?.account_details?.bank_name ?? "",
    account_number: employee?.account_details?.account_number ?? "",
    ifsc_code: employee?.account_details?.ifsc_code ?? "",
    upi_id: employee?.account_details?.upi_id ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [panCard, setPanCard] = useState<File | null>(null);
  const [aadhaarCard, setAadhaarCard] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const save = useEmployeesMutation((input: EmployeeInput & { id?: string }) => saveEmployee(input));

  const valid = form.name.trim() && form.phone.trim() && form.joining_date && form.company.trim();
  const hasAccountDetails = form.bank_name || form.account_number || form.ifsc_code || form.upi_id;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save.mutate(
      {
        id: employee?._id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        gender: form.gender || undefined,
        joining_date: form.joining_date,
        company: form.company.trim(),
        current_salary: form.current_salary.trim() ? Number(form.current_salary) : undefined,
        status: form.status as Employee["status"],
        account_details: hasAccountDetails
          ? { bank_name: form.bank_name.trim() || undefined, account_number: form.account_number.trim() || undefined, ifsc_code: form.ifsc_code.trim() || undefined, upi_id: form.upi_id.trim() || undefined }
          : undefined,
        pan_card: panCard,
        aadhaar_card: aadhaarCard,
        photo,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">{(id) => <Input id={id} required value={form.name} onChange={(e) => set("name")(e.target.value)} />}</Field>
        <Field label="Phone">{(id) => <Input id={id} type="tel" required value={form.phone} onChange={(e) => set("phone")(e.target.value)} />}</Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email (optional)">{(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />}</Field>
        <Field label="Gender (optional)">
          {(id) => (
            <Select id={id} value={form.gender} onChange={(e) => set("gender")(e.target.value)}>
              <option value="">Not set</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company">{(id) => <Input id={id} required value={form.company} onChange={(e) => set("company")(e.target.value)} />}</Field>
        <Field label="Joining date">{(id) => <Input id={id} type="date" required value={form.joining_date} onChange={(e) => set("joining_date")(e.target.value)} />}</Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={employee ? "Current salary" : "Starting salary (optional)"}>
          {(id) => <Input id={id} type="number" inputMode="numeric" min={0} value={form.current_salary} onChange={(e) => set("current_salary")(e.target.value)} />}
        </Field>
        <Field label="Status">
          {(id) => (
            <Select id={id} value={form.status} onChange={(e) => set("status")(e.target.value)}>
              {EMPLOYEE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-medium">Bank details (optional)</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bank name">{(id) => <Input id={id} value={form.bank_name} onChange={(e) => set("bank_name")(e.target.value)} />}</Field>
          <Field label="Account number">{(id) => <Input id={id} value={form.account_number} onChange={(e) => set("account_number")(e.target.value)} />}</Field>
          <Field label="IFSC code">{(id) => <Input id={id} value={form.ifsc_code} onChange={(e) => set("ifsc_code")(e.target.value)} />}</Field>
          <Field label="UPI ID">{(id) => <Input id={id} value={form.upi_id} onChange={(e) => set("upi_id")(e.target.value)} />}</Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-medium">Documents (optional)</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="PAN card">{(id) => <Input id={id} type="file" accept="image/*,.pdf" onChange={(e) => setPanCard(fileRef(e.target.files))} />}</Field>
          <Field label="Aadhaar card">{(id) => <Input id={id} type="file" accept="image/*,.pdf" onChange={(e) => setAadhaarCard(fileRef(e.target.files))} />}</Field>
          <Field label="Photo">{(id) => <Input id={id} type="file" accept="image/*" onChange={(e) => setPhoto(fileRef(e.target.files))} />}</Field>
        </div>
        {employee && (employee.pan_card || employee.aadhaar_card || employee.photo) && <p className="text-xs text-muted">Leave blank to keep what&apos;s already uploaded.</p>}
      </fieldset>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          {employee ? "Save changes" : "Add employee"}
        </Button>
      </div>
    </form>
  );
}
