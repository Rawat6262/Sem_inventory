"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { addTaxableEntry, fmtMoney, GST_RATES, useFinanceVendorsMutation, type TaxableEntryInput } from "@/lib/finance-vendors";
import { useVendors } from "@/lib/vendors";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Pre-pick a vendor (adding another entry from their own ledger page). */
  vendorId?: string;
  vendorName?: string;
  /** Vendors who already have a ledger — hidden from the picker when adding fresh. */
  excludeVendorIds?: string[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TaxableEntryDialog({ open, onClose, vendorId, vendorName, excludeVendorIds }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Add taxable entry" description={vendorName}>
      {open && <TaxableEntryForm vendorId={vendorId} excludeVendorIds={excludeVendorIds} onDone={onClose} />}
    </Modal>
  );
}

function TaxableEntryForm({ vendorId, excludeVendorIds, onDone }: { vendorId?: string; excludeVendorIds?: string[]; onDone: () => void }) {
  const vendors = useVendors();
  const [vendor, setVendor] = useState(vendorId ?? "");
  const [taxableAmount, setTaxableAmount] = useState("");
  const [rate, setRate] = useState("18");
  const [date, setDate] = useState(today());
  const save = useFinanceVendorsMutation((input: TaxableEntryInput) => addTaxableEntry(input));

  const amt = Number(taxableAmount);
  const r = Number(rate);
  const gst = amt > 0 && r >= 0 ? (amt * r) / 100 : 0;
  const valid = Boolean(vendor) && amt > 0 && r >= 0 && r <= 18 && Boolean(date);

  const available = vendorId ? null : (vendors.data ?? []).filter((v) => !excludeVendorIds?.includes(v._id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save.mutate({ vendor, taxableAmount: amt, rate: r, date }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {!vendorId && (
        <Field label="Vendor" hint={available && available.length === 0 ? "Every vendor already has a ledger — add the entry from their own page instead." : undefined}>
          {(id) => (
            <Select id={id} required value={vendor} onChange={(e) => setVendor(e.target.value)} disabled={vendors.isPending}>
              <option value="">{vendors.isPending ? "Loading…" : "Select vendor"}</option>
              {available?.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vendorName}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Taxable amount">
          {(id) => <Input id={id} type="number" inputMode="decimal" required min={0.01} step={0.01} value={taxableAmount} onChange={(e) => setTaxableAmount(e.target.value)} />}
        </Field>
        <Field label="GST rate %" hint="0 to 18">
          {(id) => (
            <Input id={id} type="number" inputMode="numeric" required min={0} max={18} list="gst-rates" value={rate} onChange={(e) => setRate(e.target.value)} />
          )}
        </Field>
      </div>
      <datalist id="gst-rates">
        {GST_RATES.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <Field label="Date">{(id) => <Input id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>

      {amt > 0 && <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">GST payable on this entry: <span className="font-semibold tabular-nums">{fmtMoney(gst)}</span></div>}

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          Add entry
        </Button>
      </div>
    </form>
  );
}
