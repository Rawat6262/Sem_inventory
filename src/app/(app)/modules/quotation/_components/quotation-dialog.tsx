"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { createQuotation, useQuotationsMutation, type QuotationHeaderInput } from "@/lib/quotations";

type Props = { open: boolean; onClose: () => void };

export function QuotationDialog({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Add quotation" description="Items are added afterward, on the quotation's own page.">
      {open && <QuotationForm onDone={onClose} />}
    </Modal>
  );
}

function QuotationForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [exhibitionName, setExhibitionName] = useState("");
  const [exhibitionDate, setExhibitionDate] = useState("");
  const [venue, setVenue] = useState("");
  const [gstPercent, setGstPercent] = useState("18");
  const save = useQuotationsMutation((input: QuotationHeaderInput) => createQuotation(input));

  const valid = companyName.trim() && exhibitionName.trim() && exhibitionDate.trim();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save.mutate(
      {
        company_name: companyName.trim(),
        exhibition_name: exhibitionName.trim(),
        exhibition_date: exhibitionDate.trim(),
        venue: venue.trim() || undefined,
        gst_percent: gstPercent.trim() ? Number(gstPercent) : undefined,
      },
      {
        onSuccess: (res) => {
          onDone();
          const id = (res as { data?: { _id?: string } })?.data?._id;
          if (id) router.push(`/modules/quotation/${id}`);
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Company name" hint="The quotation's title is generated from this automatically.">
        {(id) => <Input id={id} required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. BOBCAT" />}
      </Field>
      <Field label="Exhibition name">{(id) => <Input id={id} required value={exhibitionName} onChange={(e) => setExhibitionName(e.target.value)} />}</Field>
      <Field label="Exhibition date" hint="Free text — a single date or a range">
        {(id) => <Input id={id} required value={exhibitionDate} onChange={(e) => setExhibitionDate(e.target.value)} placeholder="e.g. 22-24 July 2026" />}
      </Field>
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
          Add quotation
        </Button>
      </div>
    </form>
  );
}
