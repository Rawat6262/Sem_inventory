"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { savePerson, useManpowerMutation, type Person, type PersonInput } from "@/lib/manpower";

type Props = { open: boolean; onClose: () => void; person?: Person | null };

export function PersonDialog({ open, onClose, person }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={person ? "Edit worker" : "Add worker"}>
      {open && <PersonForm key={person?._id ?? "new"} person={person} onDone={onClose} />}
    </Modal>
  );
}

function PersonForm({ person, onDone }: { person?: Person | null; onDone: () => void }) {
  const [name, setName] = useState(person?.name ?? "");
  const [phone, setPhone] = useState(person?.phone ?? "");
  const save = useManpowerMutation((input: PersonInput & { id?: string }) => savePerson(input));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({ id: person?._id, name: name.trim(), phone: phone.trim() || undefined }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name">{(id) => <Input id={id} required autoFocus value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      <Field label="Phone (optional)">{(id) => <Input id={id} type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />}</Field>
      {save.error && <Alert>{save.error.message}</Alert>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!name.trim()}>
          {person ? "Save changes" : "Add worker"}
        </Button>
      </div>
    </form>
  );
}
