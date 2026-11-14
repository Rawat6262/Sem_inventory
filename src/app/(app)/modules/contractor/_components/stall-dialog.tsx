"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveStall, useContractorsMutation, usePersons, type Stall, type StallInput, type StallType } from "@/lib/contractors";

type Props = {
  open: boolean;
  onClose: () => void;
  labourId: string;
  exhibitionId: string;
  stall?: Stall | null; // edit when set, add otherwise
};

export function StallDialog({ open, onClose, labourId, exhibitionId, stall }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={stall ? "Edit stall" : "Add stall"}>
      {open && <StallForm key={stall?._id ?? "new"} labourId={labourId} exhibitionId={exhibitionId} stall={stall} onDone={onClose} />}
    </Modal>
  );
}

function personId(p: Stall["person"]): string {
  return p && typeof p === "object" ? p._id : (p ?? "");
}

function StallForm({ labourId, exhibitionId, stall, onDone }: { labourId: string; exhibitionId: string; stall?: Stall | null; onDone: () => void }) {
  const persons = usePersons();
  const [form, setForm] = useState({
    stallType: stall?.stallType ?? ("WAGES" as StallType),
    stall_no: stall?.stall_no ?? "",
    stall_name: stall?.stall_name ?? "",
    stall_size: stall?.stall_size ?? "",
    person: personId(stall?.person),
    wageDays: stall?.wageDays != null ? String(stall.wageDays) : "",
    pms: stall?.pms != null ? String(stall.pms) : "",
    rate: stall ? String(stall.rate) : "",
    remarks: stall?.remarks ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useContractorsMutation((input: StallInput) => saveStall(input));

  const qty = form.stallType === "WAGES" ? Number(form.wageDays || 0) : Number(form.pms || 0);
  const rate = Number(form.rate || 0);
  const computedTotal = qty * rate;
  const minTotal = stall?.paid_amount ?? 0;
  const belowPaid = stall != null && computedTotal < minTotal;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (belowPaid) return;
    save.mutate(
      {
        labourId,
        exhibitionId,
        stallId: stall?._id,
        stallType: form.stallType,
        stall_no: form.stall_no.trim() || undefined,
        stall_name: form.stall_name.trim() || undefined,
        stall_size: form.stall_size.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
        ...(form.stallType === "WAGES"
          ? { person: form.person, wageDays: Number(form.wageDays), rate }
          : { pms: Number(form.pms), rate }),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Stall type" hint={stall ? "Can't be changed after the stall is created." : undefined}>
        {(id) => (
          <Select id={id} required value={form.stallType} onChange={(e) => set("stallType")(e.target.value)} disabled={Boolean(stall)}>
            <option value="WAGES">Day wages (person × days × rate)</option>
            <option value="TENDER">Tender (fixed size × rate)</option>
          </Select>
        )}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Stall number">{(id) => <Input id={id} value={form.stall_no} onChange={(e) => set("stall_no")(e.target.value)} />}</Field>
        <Field label="Stall name">{(id) => <Input id={id} value={form.stall_name} onChange={(e) => set("stall_name")(e.target.value)} />}</Field>
      </div>
      <Field label="Stall size">{(id) => <Input id={id} value={form.stall_size} onChange={(e) => set("stall_size")(e.target.value)} placeholder='e.g. 10x10 ft' />}</Field>

      {form.stallType === "WAGES" ? (
        <>
          <Field
            label="Worker"
            hint={
              persons.data && persons.data.length === 0 ? "No workers added yet. Add one in the Manpower module first." : undefined
            }
          >
            {(id) => (
              <Select id={id} required value={form.person} onChange={(e) => set("person")(e.target.value)} disabled={persons.isPending}>
                <option value="">{persons.isPending ? "Loading…" : "Select worker"}</option>
                {persons.data?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                    {p.phone ? ` (${p.phone})` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Wage days">
              {(id) => <Input id={id} type="number" inputMode="numeric" required min={0} step="0.5" value={form.wageDays} onChange={(e) => set("wageDays")(e.target.value)} />}
            </Field>
            <Field label="Rate per day">
              {(id) => <Input id={id} type="number" inputMode="numeric" required min={0} value={form.rate} onChange={(e) => set("rate")(e.target.value)} />}
            </Field>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Size (pms)">
            {(id) => <Input id={id} type="number" inputMode="numeric" required min={0} step="0.01" value={form.pms} onChange={(e) => set("pms")(e.target.value)} />}
          </Field>
          <Field label="Rate per pms">
            {(id) => <Input id={id} type="number" inputMode="numeric" required min={0} value={form.rate} onChange={(e) => set("rate")(e.target.value)} />}
          </Field>
        </div>
      )}

      <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
        Agreement amount: <span className="font-semibold tabular-nums">₹{new Intl.NumberFormat("en-IN").format(computedTotal)}</span>
      </div>
      {belowPaid && (
        <p className="text-sm text-danger">
          Already paid ₹{new Intl.NumberFormat("en-IN").format(minTotal)} on this stall — the new agreement amount can&apos;t be lower than that.
        </p>
      )}

      <Field label="Remarks (optional)">{(id) => <Textarea id={id} rows={2} value={form.remarks} onChange={(e) => set("remarks")(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={belowPaid || (form.stallType === "WAGES" && !form.person)}>
          {stall ? "Save changes" : "Add stall"}
        </Button>
      </div>
    </form>
  );
}
