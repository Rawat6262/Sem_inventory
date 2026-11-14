"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { addTripCharge, fmtMoney, useExhibitionsList, useTransportMutation, type DealPurpose, type TripChargeInput } from "@/lib/transport";

type Props = { open: boolean; onClose: () => void; transporterId: string; defaultExhibitionId?: string };

const COMMON_PURPOSES = ["transportation", "loading", "unloading", "other", "Misc"];

export function TripChargeDialog({ open, onClose, transporterId, defaultExhibitionId }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Add trip charge">
      {open && <TripChargeForm transporterId={transporterId} defaultExhibitionId={defaultExhibitionId} onDone={onClose} />}
    </Modal>
  );
}

function TripChargeForm({ transporterId, defaultExhibitionId, onDone }: { transporterId: string; defaultExhibitionId?: string; onDone: () => void }) {
  const exhibitions = useExhibitionsList();
  const [exhibitionId, setExhibitionId] = useState(defaultExhibitionId ?? "");
  const [vehicleNo, setVehicleNo] = useState("");
  const [rows, setRows] = useState<DealPurpose[]>([{ purpose: "transportation", amount: 0 }]);
  const [remarks, setRemarks] = useState("");
  const save = useTransportMutation((input: TripChargeInput) => addTripCharge(input));

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const purposeNames = rows.map((r) => r.purpose.trim().toLowerCase());
  const hasDuplicate = new Set(purposeNames).size !== purposeNames.length;
  const valid = Boolean(exhibitionId) && rows.every((r) => r.purpose.trim() && Number(r.amount) > 0) && !hasDuplicate;

  function updateRow(i: number, patch: Partial<DealPurpose>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    save.mutate(
      {
        exhibition: exhibitionId,
        transporter: transporterId,
        purposes: rows.map((r) => ({ purpose: r.purpose.trim(), amount: Number(r.amount) })),
        vehicleNo: vehicleNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Exhibition">
        {(id) => (
          <Select id={id} required value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} disabled={exhibitions.isPending || Boolean(defaultExhibitionId)}>
            <option value="">{exhibitions.isPending ? "Loading…" : "Select exhibition"}</option>
            {exhibitions.data?.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.name}
                {ex.city ? ` — ${ex.city}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Vehicle number (optional)">{(id) => <Input id={id} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. DL 1AB 2345" />}</Field>

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field label={i === 0 ? "Purpose" : ""} className="flex-1">
              {(id) => <Input id={id} list="trip-charge-purposes" required value={row.purpose} onChange={(e) => updateRow(i, { purpose: e.target.value })} />}
            </Field>
            <Field label={i === 0 ? "Amount" : ""} className="w-32">
              {(id) => <Input id={id} type="number" inputMode="numeric" required min={1} value={row.amount || ""} onChange={(e) => updateRow(i, { amount: Number(e.target.value) })} />}
            </Field>
            {rows.length > 1 && (
              <Button type="button" variant="ghost" className="mb-0.5 h-10 px-2 text-danger" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))} aria-label="Remove row">
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        ))}
        <datalist id="trip-charge-purposes">
          {COMMON_PURPOSES.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <Button type="button" variant="secondary" className="self-start" onClick={() => setRows((r) => [...r, { purpose: "", amount: 0 }])}>
          <Plus className="size-4" aria-hidden />
          Add another purpose
        </Button>
      </div>

      {hasDuplicate && <p className="text-sm text-danger">Each purpose can only appear once.</p>}

      <Field label="Remarks (optional)">{(id) => <Textarea id={id} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />}</Field>

      <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
        Total: <span className="font-semibold tabular-nums">{fmtMoney(total)}</span>
      </div>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          Add trip charge
        </Button>
      </div>
    </form>
  );
}
