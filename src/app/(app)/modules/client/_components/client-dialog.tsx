"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, PhoneInput } from "@/components/ui";
import { saveClient, useClientsMutation, type Client, type ClientInput } from "@/lib/clients";

type Props = { open: boolean; onClose: () => void; client?: Client | null };

export function ClientDialog({ open, onClose, client }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={client ? "Edit client" : "Add client"}>
      {open && <ClientForm key={client?._id ?? "new"} client={client} onDone={onClose} />}
    </Modal>
  );
}

function ClientForm({ client, onDone }: { client?: Client | null; onDone: () => void }) {
  const [form, setForm] = useState({
    clientName: client?.clientName ?? "",
    companyName: client?.companyName ?? "",
    phoneNumber: client?.phoneNumber ?? "",
    address: client?.address ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useClientsMutation((input: ClientInput & { id?: string }) => saveClient(input));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        id: client?._id,
        clientName: form.clientName.trim(),
        companyName: form.companyName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim() || undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Company name" hint="A company can only be added once. If someone else already added it, ask them to share it with you.">
        {(id) => (
          <Input id={id} required autoFocus value={form.companyName} onChange={(e) => set("companyName")(e.target.value)} placeholder="Ramesh Furnishings Pvt Ltd" />
        )}
      </Field>
      <Field label="Client name">
        {(id) => <Input id={id} required value={form.clientName} onChange={(e) => set("clientName")(e.target.value)} placeholder="Ramesh Kumar" />}
      </Field>
      <Field label="Phone number">
        {(id) => <PhoneInput id={id} required value={form.phoneNumber} onValueChange={set("phoneNumber")} />}
      </Field>
      <Field label="Address (optional)">{(id) => <Input id={id} value={form.address} onChange={(e) => set("address")(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {client ? "Save changes" : "Add client"}
        </Button>
      </div>
    </form>
  );
}
