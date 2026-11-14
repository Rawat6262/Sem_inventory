"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { PAYMENT_MODES, saveTransporter, useTransportMutation, type Transporter, type TransporterInput } from "@/lib/transport";

type Props = { open: boolean; onClose: () => void; transporter?: Transporter | null };

export function TransporterDialog({ open, onClose, transporter }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={transporter ? "Edit transporter" : "Add transporter"}>
      {open && <TransporterForm key={transporter?._id ?? "new"} transporter={transporter} onDone={onClose} />}
    </Modal>
  );
}

function TransporterForm({ transporter, onDone }: { transporter?: Transporter | null; onDone: () => void }) {
  const [form, setForm] = useState({
    transporter_name: transporter?.transporter_name ?? "",
    phone_number: transporter?.phone_number ?? "",
    address: transporter?.address ?? "",
    city: transporter?.city ?? "",
    state: transporter?.state ?? "",
    country: transporter?.country ?? "India",
    payment: transporter?.payment ?? "cash",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useTransportMutation((input: TransporterInput & { id?: string }) => saveTransporter(input));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        id: transporter?._id,
        transporter_name: form.transporter_name.trim(),
        phone_number: form.phone_number.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        payment: form.payment,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Name">{(id) => <Input id={id} required value={form.transporter_name} onChange={(e) => set("transporter_name")(e.target.value)} />}</Field>
        <Field label="Phone number">{(id) => <Input id={id} type="tel" inputMode="numeric" required value={form.phone_number} onChange={(e) => set("phone_number")(e.target.value)} />}</Field>
      </div>
      <Field label="Address">{(id) => <Input id={id} required value={form.address} onChange={(e) => set("address")(e.target.value)} />}</Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="City">{(id) => <Input id={id} required value={form.city} onChange={(e) => set("city")(e.target.value)} />}</Field>
        <Field label="State">{(id) => <Input id={id} required value={form.state} onChange={(e) => set("state")(e.target.value)} />}</Field>
        <Field label="Country">{(id) => <Input id={id} required value={form.country} onChange={(e) => set("country")(e.target.value)} />}</Field>
      </div>
      <Field label="Preferred payment mode">
        {(id) => (
          <Select id={id} value={form.payment} onChange={(e) => set("payment")(e.target.value)}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {transporter ? "Save changes" : "Add transporter"}
        </Button>
      </div>
    </form>
  );
}
