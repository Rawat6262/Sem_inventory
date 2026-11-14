"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { saveContractor, useContractorsMutation, type Contractor, type ContractorInput } from "@/lib/contractors";

const LABOUR_TYPES = ["Carpenter", "Electrician", "Painter", "Helper", "Fabricator", "Driver", "Other"];

type Props = { open: boolean; onClose: () => void; contractor?: Contractor | null };

export function ContractorDialog({ open, onClose, contractor }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={contractor ? "Edit contractor" : "Add contractor"}>
      {open && <ContractorForm key={contractor?._id ?? "new"} contractor={contractor} onDone={onClose} />}
    </Modal>
  );
}

function ContractorForm({ contractor, onDone }: { contractor?: Contractor | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: contractor?.name ?? "",
    phone_number: contractor ? String(contractor.phone_number) : "",
    address: contractor?.address ?? "",
    labour_type: contractor?.labour_type ?? LABOUR_TYPES[0],
  });
  const save = useContractorsMutation((input: ContractorInput & { id?: string }) => saveContractor(input));
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        id: contractor?._id,
        name: form.name.trim(),
        phone_number: Number(form.phone_number),
        address: form.address.trim(),
        labour_type: form.labour_type,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name">
        {(id) => <Input id={id} required value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Ramesh Carpenter" />}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone number">
          {(id) => (
            <Input
              id={id}
              type="tel"
              inputMode="numeric"
              required
              value={form.phone_number}
              onChange={(e) => set("phone_number")(e.target.value)}
            />
          )}
        </Field>
        <Field label="Type">
          {(id) => (
            <Select id={id} required value={form.labour_type} onChange={(e) => set("labour_type")(e.target.value)}>
              {LABOUR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {!LABOUR_TYPES.includes(form.labour_type) && <option value={form.labour_type}>{form.labour_type}</option>}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Address">{(id) => <Input id={id} required value={form.address} onChange={(e) => set("address")(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {contractor ? "Save changes" : "Add contractor"}
        </Button>
      </div>
    </form>
  );
}
