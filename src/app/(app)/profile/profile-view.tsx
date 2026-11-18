"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Lock, UserRound } from "lucide-react";
import { useState } from "react";
import { EmptyState, QueryState } from "@/components/data-ui";
import { Alert, Button, Field, Input, PhoneInput, Select, todayInput } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import { hasProfile } from "@/lib/permissions";
import {
  employeeKeys,
  fmtDate,
  fmtMoney,
  GENDERS,
  missingProfileFields,
  profileKey,
  saveMyProfile,
  useMyProfile,
  type Employee,
  type ProfileInput,
} from "@/lib/employees";

export function ProfileView() {
  const me = useMe().data;
  const allowed = Boolean(me && hasProfile(me.role));
  const profile = useMyProfile(allowed);

  if (!me) return null;

  if (!allowed) {
    return (
      <EmptyState icon={<Lock className="size-6" />} title="No staff profile">
        Profiles are for employee, account and supervisor users.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <UserRound className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
          <p className="text-sm text-muted">Your employee details, documents and bank account</p>
        </div>
      </div>

      <div className="mt-6">
        <QueryState queries={[profile]}>{() => <ProfileForm key={profile.data!._id} employee={profile.data!} />}</QueryState>
      </div>
    </div>
  );
}

function fileRef(f: FileList | null): File | null {
  return f && f.length > 0 ? f[0] : null;
}

function ProfileForm({ employee }: { employee: Employee }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: employee.name ?? "",
    phone: employee.phone ?? "",
    gender: employee.gender ?? "",
    joining_date: employee.joining_date ? employee.joining_date.slice(0, 10) : "",
    company: employee.company ?? "",
    bank_name: employee.account_details?.bank_name ?? "",
    account_number: employee.account_details?.account_number ?? "",
    ifsc_code: employee.account_details?.ifsc_code ?? "",
    upi_id: employee.account_details?.upi_id ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [panCard, setPanCard] = useState<File | null>(null);
  const [aadhaarCard, setAadhaarCard] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (input: ProfileInput) => saveMyProfile(input),
    onSuccess: () => {
      setSaved(true);
      setPanCard(null);
      setAadhaarCard(null);
      setPhoto(null);
      qc.invalidateQueries({ queryKey: profileKey });
      qc.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });

  const valid = form.name.trim() && form.phone.trim() && form.joining_date && form.company.trim();
  const hasAccountDetails = form.bank_name || form.account_number || form.ifsc_code || form.upi_id;
  const missing = missingProfileFields(employee);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaved(false);
    save.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      gender: form.gender || undefined,
      joining_date: form.joining_date,
      company: form.company.trim(),
      account_details: hasAccountDetails
        ? {
            bank_name: form.bank_name.trim() || undefined,
            account_number: form.account_number.trim() || undefined,
            ifsc_code: form.ifsc_code.trim() || undefined,
            upi_id: form.upi_id.trim() || undefined,
          }
        : undefined,
      pan_card: panCard,
      aadhaar_card: aadhaarCard,
      photo,
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {missing.length > 0 && <Alert tone="info">Your profile is missing: {missing.join(", ")}. Fill these in and save.</Alert>}

      <dl className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Email</dt>
          <dd className="mt-0.5 break-all font-medium">{employee.email || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Status</dt>
          <dd className="mt-0.5 font-medium capitalize">{employee.status}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Current salary</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{employee.current_salary ? fmtMoney(employee.current_salary) : "Not set yet"}</dd>
        </div>
        <p className="text-xs text-muted sm:col-span-3">Email, status and salary are managed by the admin.</p>
      </dl>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-medium">Personal details</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name">{(id) => <Input id={id} required value={form.name} onChange={(e) => set("name")(e.target.value)} />}</Field>
          <Field label="Phone">{(id) => <PhoneInput id={id} required value={form.phone} onValueChange={set("phone")} />}</Field>
          <Field label="Gender">
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
          <Field label="Company">{(id) => <Input id={id} required value={form.company} onChange={(e) => set("company")(e.target.value)} />}</Field>
          <Field label="Joining date" hint={employee.joining_date ? `Currently ${fmtDate(employee.joining_date)}` : undefined}>
            {(id) => <Input id={id} type="date" required max={todayInput()} value={form.joining_date} onChange={(e) => set("joining_date")(e.target.value)} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-medium">Bank details</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Bank name">{(id) => <Input id={id} value={form.bank_name} onChange={(e) => set("bank_name")(e.target.value)} />}</Field>
          <Field label="Account number">{(id) => <Input id={id} value={form.account_number} onChange={(e) => set("account_number")(e.target.value)} />}</Field>
          <Field label="IFSC code">{(id) => <Input id={id} value={form.ifsc_code} onChange={(e) => set("ifsc_code")(e.target.value)} />}</Field>
          <Field label="UPI ID">{(id) => <Input id={id} value={form.upi_id} onChange={(e) => set("upi_id")(e.target.value)} />}</Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <legend className="px-1 text-sm font-medium">Documents</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DocField label="Photo" accept="image/*" current={employee.photo} onPick={setPhoto} />
          <DocField label="PAN card" accept="image/*,.pdf" current={employee.pan_card} onPick={setPanCard} />
          <DocField label="Aadhaar card" accept="image/*,.pdf" current={employee.aadhaar_card} onPick={setAadhaarCard} />
        </div>
        <p className="text-xs text-muted">Leave a file empty to keep what&apos;s already uploaded.</p>
      </fieldset>

      {save.error && <Alert>{save.error.message}</Alert>}
      {saved && !save.isPending && <Alert tone="success">Profile saved.</Alert>}

      <div className="flex justify-end border-t border-line pt-4">
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function DocField({ label, accept, current, onPick }: { label: string; accept: string; current?: string; onPick: (f: File | null) => void }) {
  return (
    <Field label={label}>
      {(id) => (
        <div className="flex flex-col gap-1.5">
          <Input id={id} type="file" accept={accept} onChange={(e) => onPick(fileRef(e.target.files))} />
          {current ? (
            <a href={current} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
              View uploaded {label.toLowerCase()}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : (
            <span className="text-xs text-muted">Not uploaded yet</span>
          )}
        </div>
      )}
    </Field>
  );
}
