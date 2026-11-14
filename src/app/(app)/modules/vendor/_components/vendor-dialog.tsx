"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { saveVendor, useVendorsMutation, VENDOR_CATEGORIES, type Vendor, type VendorInput } from "@/lib/vendors";

type Props = { open: boolean; onClose: () => void; vendor?: Vendor | null };

export function VendorDialog({ open, onClose, vendor }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={vendor ? "Edit vendor" : "Add vendor"}>
      {open && <VendorForm key={vendor?._id ?? "new"} vendor={vendor} onDone={onClose} />}
    </Modal>
  );
}

function VendorForm({ vendor, onDone }: { vendor?: Vendor | null; onDone: () => void }) {
  const [form, setForm] = useState({
    vendorName: vendor?.vendorName ?? "",
    category: vendor?.category ?? VENDOR_CATEGORIES[0],
    phoneNo: vendor?.phoneNo ?? "",
    email: vendor?.email ?? "",
    address: vendor?.address ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useVendorsMutation((input: VendorInput & { id?: string }) => saveVendor(input));

  const phoneValid = /^[0-9]{10}$/.test(form.phoneNo);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid || form.vendorName.trim().length < 3) return;
    save.mutate(
      {
        id: vendor?._id,
        vendorName: form.vendorName.trim(),
        category: form.category,
        phoneNo: form.phoneNo.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Vendor name" hint="At least 3 characters">
        {(id) => <Input id={id} required minLength={3} value={form.vendorName} onChange={(e) => set("vendorName")(e.target.value)} />}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category">
          {(id) => (
            <Select id={id} required value={form.category} onChange={(e) => set("category")(e.target.value)}>
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Phone number" hint="10 digits">
          {(id) => (
            <Input
              id={id}
              type="tel"
              inputMode="numeric"
              required
              value={form.phoneNo}
              onChange={(e) => set("phoneNo")(e.target.value.replace(/\D/g, "").slice(0, 10))}
              aria-invalid={form.phoneNo.length > 0 && !phoneValid}
            />
          )}
        </Field>
      </div>
      <Field label="Email (optional)">{(id) => <Input id={id} type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} />}</Field>
      <Field label="Address (optional)">{(id) => <Input id={id} value={form.address} onChange={(e) => set("address")(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!phoneValid || form.vendorName.trim().length < 3}>
          {vendor ? "Save changes" : "Add vendor"}
        </Button>
      </div>
    </form>
  );
}
