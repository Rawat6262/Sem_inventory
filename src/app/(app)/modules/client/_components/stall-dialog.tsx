"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { addClientStall, updateClientStall, useClientsMutation, type ClientStall } from "@/lib/clients";

type Props = {
  open: boolean;
  onClose: () => void;
  clientId: string;
  exhibitionId: string;
  stall?: ClientStall | null; // edit when set, add otherwise
};

export function StallDialog({ open, onClose, clientId, exhibitionId, stall }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={stall ? "Edit stall" : "Add stall"}>
      {open && <StallForm key={stall?._id ?? "new"} clientId={clientId} exhibitionId={exhibitionId} stall={stall} onDone={onClose} />}
    </Modal>
  );
}

function StallForm({ clientId, exhibitionId, stall, onDone }: { clientId: string; exhibitionId: string; stall?: ClientStall | null; onDone: () => void }) {
  const [form, setForm] = useState({
    stall_no: stall?.stall_no ?? "",
    stall_name: stall?.stall_name ?? "",
    stall_size: stall?.stall_size ?? "",
    deal_amount: stall ? "" : "",
    advance_payment: "",
    received_payment: "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const update = useClientsMutation(updateClientStall);
  const add = useClientsMutation(addClientStall);
  const save = stall ? update : add;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const base = {
      stall_no: form.stall_no.trim() || undefined,
      stall_name: form.stall_name.trim() || undefined,
      stall_size: form.stall_size.trim() || undefined,
    };
    if (stall) {
      update.mutate({ clientId, exhibitionId, stallId: stall._id, ...base }, { onSuccess: onDone });
    } else {
      add.mutate(
        {
          clientId,
          exhibitionId,
          ...base,
          deal_amount: form.deal_amount ? Number(form.deal_amount) : undefined,
          advance_payment: form.advance_payment ? Number(form.advance_payment) : undefined,
          received_payment: form.received_payment ? Number(form.received_payment) : undefined,
        },
        { onSuccess: onDone },
      );
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Stall number">{(id) => <Input id={id} value={form.stall_no} onChange={(e) => set("stall_no")(e.target.value)} />}</Field>
        <Field label="Stall name">{(id) => <Input id={id} value={form.stall_name} onChange={(e) => set("stall_name")(e.target.value)} />}</Field>
      </div>
      <Field label="Stall size">{(id) => <Input id={id} value={form.stall_size} onChange={(e) => set("stall_size")(e.target.value)} placeholder="e.g. 6x6 sqmtr" />}</Field>

      {!stall && (
        <>
          <p className="text-xs font-medium text-muted">Payment (optional — can also be recorded later)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Deal amount">
              {(id) => <Input id={id} type="number" inputMode="numeric" min={0} value={form.deal_amount} onChange={(e) => set("deal_amount")(e.target.value)} />}
            </Field>
            <Field label="Advance paid">
              {(id) => <Input id={id} type="number" inputMode="numeric" min={0} value={form.advance_payment} onChange={(e) => set("advance_payment")(e.target.value)} />}
            </Field>
            <Field label="Received">
              {(id) => <Input id={id} type="number" inputMode="numeric" min={0} value={form.received_payment} onChange={(e) => set("received_payment")(e.target.value)} />}
            </Field>
          </div>
        </>
      )}

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {stall ? "Save changes" : "Add stall"}
        </Button>
      </div>
    </form>
  );
}
