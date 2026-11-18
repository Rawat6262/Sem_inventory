"use client";

import { useState } from "react";
import { LocationFields } from "@/components/location-fields";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, PhoneInput, Textarea } from "@/components/ui";
import { saveExhibition, useExhibitionsMutation, type Exhibition, type ExhibitionInput } from "@/lib/exhibitions";

type Props = { open: boolean; onClose: () => void; exhibition?: Exhibition | null };

export function ExhibitionDialog({ open, onClose, exhibition }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={exhibition ? "Edit exhibition" : "Add exhibition"}>
      {open && <ExhibitionForm key={exhibition?._id ?? "new"} exhibition={exhibition} onDone={onClose} />}
    </Modal>
  );
}

function toDateInput(d?: string) {
  return d ? d.slice(0, 10) : "";
}

function ExhibitionForm({ exhibition, onDone }: { exhibition?: Exhibition | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: exhibition?.name ?? "",
    venue: exhibition?.venue ?? "",
    startDate: toDateInput(exhibition?.startDate),
    endDate: toDateInput(exhibition?.endDate),
    country: exhibition?.country ?? "India",
    state: exhibition?.state ?? "",
    city: exhibition?.city ?? "",
    organiser: exhibition?.organiser ?? "",
    email: exhibition?.email ?? "",
    phone: exhibition?.phone ?? "",
    zipCode: exhibition?.zipCode ?? "",
    remarks: exhibition?.remarks ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useExhibitionsMutation((input: ExhibitionInput & { id?: string }) => saveExhibition(input));

  const dateOrderInvalid = Boolean(form.startDate && form.endDate && form.endDate < form.startDate);
  const isIndia = form.country.trim().toLowerCase() === "india";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (dateOrderInvalid) return;
    save.mutate(
      {
        id: exhibition?._id,
        name: form.name.trim(),
        venue: form.venue.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        country: form.country.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        organiser: form.organiser.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        zipCode: form.zipCode.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Exhibition name">
        {(id) => <Input id={id} required value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="India Mart Expo 2026" />}
      </Field>
      <Field label="Venue">{(id) => <Input id={id} required value={form.venue} onChange={(e) => set("venue")(e.target.value)} />}</Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Start date">
          {(id) => <Input id={id} type="date" required value={form.startDate} onChange={(e) => set("startDate")(e.target.value)} />}
        </Field>
        <Field label="End date" hint={dateOrderInvalid ? "Can't be before the start date." : undefined}>
          {(id) => (
            <Input
              id={id}
              type="date"
              required
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(e) => set("endDate")(e.target.value)}
              aria-invalid={dateOrderInvalid || undefined}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LocationFields
          value={{ country: form.country, state: form.state, city: form.city }}
          onChange={(loc) => setForm((f) => ({ ...f, ...loc }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Organiser (optional)">{(id) => <Input id={id} value={form.organiser} onChange={(e) => set("organiser")(e.target.value)} />}</Field>
        <Field label={isIndia ? "PIN code (optional)" : "Zip code (optional)"} hint={isIndia ? "6 digits" : undefined}>
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              maxLength={isIndia ? 6 : 10}
              pattern={isIndia ? "\\d{6}" : "[A-Za-z0-9 -]{3,10}"}
              title={isIndia ? "Enter the 6-digit PIN code" : "Enter a valid zip code"}
              value={form.zipCode}
              onChange={(e) => set("zipCode")(isIndia ? e.target.value.replace(/\D/g, "") : e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email (optional)">{(id) => <Input id={id} type="email" autoComplete="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />}</Field>
        <Field label="Phone (optional)" hint="10 to 12 digits">{(id) => <PhoneInput id={id} value={form.phone} onValueChange={set("phone")} />}</Field>
      </div>

      <Field label="Remarks (optional)">{(id) => <Textarea id={id} rows={2} value={form.remarks} onChange={(e) => set("remarks")(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={dateOrderInvalid}>
          {exhibition ? "Save changes" : "Add exhibition"}
        </Button>
      </div>
    </form>
  );
}
