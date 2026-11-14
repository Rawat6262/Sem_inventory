"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import { addQuotationItem, updateQuotationItem, useQuotationsMutation, type QuotationItem, type QuotationItemInput } from "@/lib/quotations";

type Props = { open: boolean; onClose: () => void; quotationId: string; item?: QuotationItem | null };

export function ItemDialog({ open, onClose, quotationId, item }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={item ? "Edit item" : "Add item"}>
      {open && <ItemForm key={item?._id ?? "new"} quotationId={quotationId} item={item} onDone={onClose} />}
    </Modal>
  );
}

function ItemForm({ quotationId, item, onDone }: { quotationId: string; item?: QuotationItem | null; onDone: () => void }) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [size, setSize] = useState(item?.size ?? "");
  const [cost, setCost] = useState(item ? String(item.cost) : "");
  const [lines, setLines] = useState<string[]>(item?.description.length ? item.description : [""]);

  const add = useQuotationsMutation((input: QuotationItemInput & { id: string }) => addQuotationItem(input));
  const update = useQuotationsMutation((input: QuotationItemInput & { id: string; itemId: string }) => updateQuotationItem(input));
  const saving = item ? update : add;

  const cleanLines = lines.map((l) => l.trim()).filter(Boolean);
  const valid = title.trim() && Number(cost) >= 0 && cost !== "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const body: QuotationItemInput = { title: title.trim(), size: size.trim() || undefined, description: cleanLines, cost: Number(cost) };
    if (item) update.mutate({ id: quotationId, itemId: item._id, ...body }, { onSuccess: onDone });
    else add.mutate({ id: quotationId, ...body }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Title">{(id) => <Input id={id} required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Stall Fabrication" />}</Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Size (optional)">{(id) => <Input id={id} value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 32x19 sqmtr" />}</Field>
        <Field label="Cost">{(id) => <Input id={id} type="number" inputMode="numeric" required min={0} value={cost} onChange={(e) => setCost(e.target.value)} />}</Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">What&apos;s included (optional)</span>
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={line}
              onChange={(e) => setLines((ls) => ls.map((l, idx) => (idx === i ? e.target.value : l)))}
              placeholder="e.g. Wooden structure (as per design)"
            />
            {lines.length > 1 && (
              <Button type="button" variant="ghost" className="h-10 px-2 text-danger" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} aria-label="Remove line">
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" className="self-start" onClick={() => setLines((ls) => [...ls, ""])}>
          <Plus className="size-4" aria-hidden />
          Add a line
        </Button>
      </div>

      {saving.error && <Alert>{saving.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={saving.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={saving.isPending} disabled={!valid}>
          {item ? "Save changes" : "Add item"}
        </Button>
      </div>
    </form>
  );
}
