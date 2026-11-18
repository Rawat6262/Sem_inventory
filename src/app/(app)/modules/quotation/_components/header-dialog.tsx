"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { updateQuotation, useQuotationsMutation, type Quotation, type QuotationHeaderInput } from "@/lib/quotations";

type Props = { open: boolean; onClose: () => void; quotation: Quotation };

export function HeaderDialog({ open, onClose, quotation }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Edit quotation details">
      {open && <HeaderForm quotation={quotation} onDone={onClose} />}
    </Modal>
  );
}

function HeaderForm({ quotation, onDone }: { quotation: Quotation; onDone: () => void }) {
  const [title, setTitle] = useState(quotation.title);
  const [companyName, setCompanyName] = useState(quotation.company_name);
  const [exhibitionName, setExhibitionName] = useState(quotation.exhibition_name);
  const [exhibitionDate, setExhibitionDate] = useState(quotation.exhibition_date);
  const [venue, setVenue] = useState(quotation.venue ?? "");
  const [gstPercent, setGstPercent] = useState(String(quotation.gst_percent));
  const save = useQuotationsMutation((input: Partial<QuotationHeaderInput> & { id: string; title?: string }) => updateQuotation(input));

  const valid = title.trim() && companyName.trim() && exhibitionName.trim() && exhibitionDate.trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save.mutate(
      {
        id: quotation._id,
        title: title.trim(),
        company_name: companyName.trim(),
        exhibition_name: exhibitionName.trim(),
        exhibition_date: exhibitionDate.trim(),
        venue: venue.trim() || undefined,
        gst_percent: gstPercent.trim() ? Number(gstPercent) : undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Title">{(id) => <Input id={id} required value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
      <Field label="Company name">{(id) => <Input id={id} required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />}</Field>
      <Field label="Exhibition name">{(id) => <Input id={id} required value={exhibitionName} onChange={(e) => setExhibitionName(e.target.value)} />}</Field>
      <Field label="Exhibition date">{(id) => <Input id={id} required value={exhibitionDate} onChange={(e) => setExhibitionDate(e.target.value)} />}</Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Venue (optional)">{(id) => <Input id={id} value={venue} onChange={(e) => setVenue(e.target.value)} />}</Field>
        <Field label="GST %">{(id) => <Input id={id} type="number" inputMode="numeric" min={0} max={28} value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />}</Field>
      </div>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
