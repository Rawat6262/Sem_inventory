"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import {
  fmtMoney,
  saveWorkPayment,
  useExhibitionsList,
  useManpowerMutation,
  type WorkPayment,
  type WorkPaymentInput,
  type WorkType,
} from "@/lib/manpower";

type Props = { open: boolean; onClose: () => void; personId: string; workPayment?: WorkPayment | null };

export function WorkPaymentDialog({ open, onClose, personId, workPayment }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={workPayment ? "Edit work payment" : "Add work payment"}>
      {open && <WorkPaymentForm key={workPayment?._id ?? "new"} personId={personId} workPayment={workPayment} onDone={onClose} />}
    </Modal>
  );
}

function exhibitionId(e: WorkPayment["exhibition"] | undefined): string {
  return e && typeof e === "object" ? e._id : (e ?? "");
}

function WorkPaymentForm({ personId, workPayment, onDone }: { personId: string; workPayment?: WorkPayment | null; onDone: () => void }) {
  const { data: me } = useMe();
  const exhibitions = useExhibitionsList();
  const [form, setForm] = useState({
    exhibition: exhibitionId(workPayment?.exhibition),
    workType: workPayment?.workType ?? ("DAY_WAGE" as WorkType),
    labourType: workPayment?.labourType ?? "",
    wageDays: workPayment?.wageDays != null ? String(workPayment.wageDays) : "",
    stallName: workPayment?.stallName ?? "",
    stallNo: workPayment?.stallNo ?? "",
    size: workPayment?.size != null ? String(workPayment.size) : "",
    rate: workPayment ? String(workPayment.rate) : "",
    remarks: workPayment?.remarks ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useManpowerMutation((input: WorkPaymentInput) => saveWorkPayment(input));

  const qty = form.workType === "DAY_WAGE" ? Number(form.wageDays || 0) : Number(form.size || 0);
  const total = qty * Number(form.rate || 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        id: workPayment?._id,
        exhibition: form.exhibition,
        person: personId,
        workType: form.workType,
        rate: Number(form.rate),
        remarks: form.remarks.trim() || undefined,
        ...(form.workType === "DAY_WAGE"
          ? { labourType: form.labourType.trim() || undefined, wageDays: Number(form.wageDays) }
          : { stallName: form.stallName.trim() || undefined, stallNo: form.stallNo.trim() || undefined, size: Number(form.size) }),
        ...(workPayment ? {} : { createdBy: me?._id }),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Exhibition">
        {(id) => (
          <Select id={id} required value={form.exhibition} onChange={(e) => set("exhibition")(e.target.value)} disabled={exhibitions.isPending}>
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

      <Field label="Work type" hint={workPayment ? "Can't be changed after it's created." : undefined}>
        {(id) => (
          <Select id={id} required value={form.workType} onChange={(e) => set("workType")(e.target.value)} disabled={Boolean(workPayment)}>
            <option value="DAY_WAGE">Day wages (days × rate)</option>
            <option value="TENDER">Tender (size × rate)</option>
          </Select>
        )}
      </Field>

      {form.workType === "DAY_WAGE" ? (
        <>
          <Field label="Labour type (optional)">
            {(id) => <Input id={id} value={form.labourType} onChange={(e) => set("labourType")(e.target.value)} placeholder="e.g. Loader, Helper" />}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Wage days">
              {(id) => <Input id={id} type="number" inputMode="numeric" required min={0.5} step="0.5" value={form.wageDays} onChange={(e) => set("wageDays")(e.target.value)} />}
            </Field>
            <Field label="Rate per day">
              {(id) => <Input id={id} type="number" inputMode="numeric" required min={1} value={form.rate} onChange={(e) => set("rate")(e.target.value)} />}
            </Field>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Stall name">{(id) => <Input id={id} value={form.stallName} onChange={(e) => set("stallName")(e.target.value)} />}</Field>
            <Field label="Stall number">{(id) => <Input id={id} value={form.stallNo} onChange={(e) => set("stallNo")(e.target.value)} />}</Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Size">{(id) => <Input id={id} type="number" inputMode="numeric" required min={0.01} step="0.01" value={form.size} onChange={(e) => set("size")(e.target.value)} />}</Field>
            <Field label="Rate per size">{(id) => <Input id={id} type="number" inputMode="numeric" required min={1} value={form.rate} onChange={(e) => set("rate")(e.target.value)} />}</Field>
          </div>
        </>
      )}

      <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
        Total: <span className="font-semibold tabular-nums">{fmtMoney(total)}</span>
      </div>

      <Field label="Remarks (optional)">{(id) => <Textarea id={id} rows={2} value={form.remarks} onChange={(e) => set("remarks")(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!form.exhibition || !form.rate}>
          {workPayment ? "Save changes" : "Add work payment"}
        </Button>
      </div>
    </form>
  );
}
