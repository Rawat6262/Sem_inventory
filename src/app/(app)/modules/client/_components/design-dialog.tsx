"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { createDesign, updateDesign, useClientsMutation, type Design } from "@/lib/clients";

type Props = {
  open: boolean;
  onClose: () => void;
  clientId: string;
  exhibitionId: string;
  nextOptionNo: number;
  design?: Design | null; // edit when set, add otherwise
};

export function DesignDialog({ open, onClose, clientId, exhibitionId, nextOptionNo, design }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={design ? "Edit design option" : "Add design option"}>
      {open && (
        <DesignForm
          key={design?._id ?? "new"}
          clientId={clientId}
          exhibitionId={exhibitionId}
          nextOptionNo={nextOptionNo}
          design={design}
          onDone={onClose}
        />
      )}
    </Modal>
  );
}

function DesignForm({
  clientId,
  exhibitionId,
  nextOptionNo,
  design,
  onDone,
}: {
  clientId: string;
  exhibitionId: string;
  nextOptionNo: number;
  design?: Design | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ option_no: String(design?.option_no ?? nextOptionNo), remarks: design?.remarks ?? "" });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useClientsMutation(createDesign);
  const update = useClientsMutation(updateDesign);
  const save = design ? update : create;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const option_no = Number(form.option_no);
    const remarks = form.remarks.trim() || undefined;
    if (design) {
      update.mutate({ id: design._id, option_no, remarks }, { onSuccess: onDone });
    } else {
      create.mutate({ clientId, exhibitionId, option_no, remarks }, { onSuccess: onDone });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Option number">
        {(id) => <Input id={id} type="number" inputMode="numeric" required min={1} value={form.option_no} onChange={(e) => set("option_no")(e.target.value)} />}
      </Field>
      <Field label="Remarks (optional)">{(id) => <Textarea id={id} rows={3} value={form.remarks} onChange={(e) => set("remarks")(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {design ? "Save changes" : "Add design"}
        </Button>
      </div>
    </form>
  );
}
