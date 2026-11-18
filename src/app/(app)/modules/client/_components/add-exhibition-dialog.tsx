"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { addClientStall, useClientsMutation, useExhibitionsList, type ClientExhibitionEntry } from "@/lib/clients";
import { StallMoneyFields, stallOverpaid } from "./stall-money-fields";

type Props = { open: boolean; onClose: () => void; clientId: string; already: ClientExhibitionEntry[] };

export function AddExhibitionDialog({ open, onClose, clientId, already }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Book for an exhibition">
      {open && <AddExhibitionForm clientId={clientId} already={already} onDone={onClose} />}
    </Modal>
  );
}

function AddExhibitionForm({ clientId, already, onDone }: { clientId: string; already: ClientExhibitionEntry[]; onDone: () => void }) {
  const exhibitions = useExhibitionsList();
  const [exhibitionId, setExhibitionId] = useState("");
  const [form, setForm] = useState({ stall_no: "", stall_name: "", stall_size: "", deal_amount: "", advance_payment: "", received_payment: "" });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const add = useClientsMutation(addClientStall);

  const alreadyIds = new Set(already.map((e) => (typeof e.exhibition === "object" ? e.exhibition._id : e.exhibition)));
  const available = (exhibitions.data ?? []).filter((e) => !alreadyIds.has(e._id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!exhibitionId) return;
    add.mutate(
      {
        clientId,
        exhibitionId,
        stall_no: form.stall_no.trim() || undefined,
        stall_name: form.stall_name.trim() || undefined,
        stall_size: form.stall_size.trim() || undefined,
        deal_amount: form.deal_amount ? Number(form.deal_amount) : undefined,
        advance_payment: form.advance_payment ? Number(form.advance_payment) : undefined,
        received_payment: form.received_payment ? Number(form.received_payment) : undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Exhibition" hint={exhibitions.data && available.length === 0 ? "Already booked for every exhibition." : undefined}>
        {(id) => (
          <Select id={id} required value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} disabled={exhibitions.isPending}>
            <option value="">{exhibitions.isPending ? "Loading…" : "Select exhibition"}</option>
            {available.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.name}
                {ex.city ? ` — ${ex.city}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <p className="text-xs font-medium text-muted">First stall (optional — you can add more stalls afterwards)</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Stall number">{(id) => <Input id={id} value={form.stall_no} onChange={(e) => set("stall_no")(e.target.value)} />}</Field>
        <Field label="Stall name">{(id) => <Input id={id} value={form.stall_name} onChange={(e) => set("stall_name")(e.target.value)} />}</Field>
      </div>
      <Field label="Stall size">{(id) => <Input id={id} value={form.stall_size} onChange={(e) => set("stall_size")(e.target.value)} placeholder="e.g. 6x6 sqmtr" />}</Field>
      <StallMoneyFields value={form} onChange={(k, v) => set(k)(v)} />

      {add.error && <Alert>{add.error.message}</Alert>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={add.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={add.isPending} disabled={!exhibitionId || stallOverpaid(form)}>
          Book exhibition
        </Button>
      </div>
    </form>
  );
}
