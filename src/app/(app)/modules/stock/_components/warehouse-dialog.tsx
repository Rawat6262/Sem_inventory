"use client";

import { useState } from "react";
import { LocationFields } from "@/components/location-fields";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { saveWarehouse, useStockMutation, type Warehouse, type WarehouseInput } from "@/lib/stock";

type Props = { open: boolean; onClose: () => void; warehouse?: Warehouse | null; nextNo?: number };

export function WarehouseDialog({ open, onClose, warehouse, nextNo }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={warehouse ? "Edit warehouse" : "Add warehouse"}>
      {/* Remount per open so the form starts from the right values. */}
      {open && <WarehouseForm key={warehouse?._id ?? "new"} warehouse={warehouse} nextNo={nextNo} onDone={onClose} />}
    </Modal>
  );
}

function WarehouseForm({ warehouse, nextNo, onDone }: { warehouse?: Warehouse | null; nextNo?: number; onDone: () => void }) {
  const [form, setForm] = useState({
    warehouseNo: warehouse?.warehouseNo != null ? String(warehouse.warehouseNo) : nextNo ? String(nextNo) : "",
    name: warehouse?.name ?? "",
    address: warehouse?.address ?? "",
    city: warehouse?.city ?? "",
    state: warehouse?.state ?? "",
    country: warehouse?.country ?? "India",
  });
  const save = useStockMutation((input: WarehouseInput & { id?: string }) => saveWarehouse(input));
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        id: warehouse?._id,
        warehouseNo: form.warehouseNo.trim() ? Number(form.warehouseNo) : null,
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label="Number" hint="Must be unique">
          {(id) => (
            <Input id={id} type="number" min={1} inputMode="numeric" value={form.warehouseNo} onChange={(e) => set("warehouseNo")(e.target.value)} />
          )}
        </Field>
        <Field label="Name">
          {(id) => <Input id={id} required value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Main godown" />}
        </Field>
      </div>
      <Field label="Address" hint="Must be unique">
        {(id) => <Textarea id={id} required rows={2} value={form.address} onChange={(e) => set("address")(e.target.value)} />}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LocationFields
          value={{ country: form.country, state: form.state, city: form.city }}
          onChange={(loc) => setForm((f) => ({ ...f, ...loc }))}
        />
      </div>
      {save.error && <Alert>{duplicateMessage(save.error.message)}</Alert>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {warehouse ? "Save changes" : "Add warehouse"}
        </Button>
      </div>
    </form>
  );
}

// Mongo's duplicate-key error is unreadable; say which field clashed.
function duplicateMessage(msg: string) {
  if (/E11000/.test(msg)) {
    if (/warehouseNo/.test(msg)) return "Another warehouse already has this number.";
    if (/address/.test(msg)) return "Another warehouse already has this address.";
    return "A warehouse with these details already exists.";
  }
  return msg;
}
