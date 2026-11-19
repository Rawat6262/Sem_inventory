"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  createIncomingChallan,
  fmt,
  useChallanMutation,
  useExhibitionsList,
  usePendingItems,
  type DealPurpose,
  type IncomingItemInput,
} from "@/lib/challans";
import { ApiError } from "@/lib/api";
import { useWarehouses, warehouseLabel } from "@/lib/stock";
import { fmtMoney } from "@/lib/transactions";
import { useTransporters } from "@/lib/transport";

type Props = { open: boolean; onClose: () => void };

const COMMON_PURPOSES = ["transportation", "loading", "unloading", "other"];

export function IncomingChallanDialog({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Add incoming challan" description="Goods coming back from an exhibition to a warehouse.">
      {open && <IncomingChallanForm onDone={onClose} />}
    </Modal>
  );
}

// quantity = returned to the shelf. lost and dead are on top of that.
type ItemRow = { productId: string; name: string; max: number; quantity: string; lost: string; dead: string };

const count = (v: string) => Number(v || 0);
const rowTotal = (r: ItemRow) => count(r.quantity) + count(r.lost) + count(r.dead);

function rowProblem(r: ItemRow): string | null {
  const parts = [count(r.quantity), count(r.lost), count(r.dead)];
  if (parts.some((n) => !Number.isInteger(n) || n < 0)) return "Use whole numbers, 0 or more.";
  const total = rowTotal(r);
  if (total > r.max) return `Returned + lost + dead is ${fmt(total)}, but only ${fmt(r.max)} are pending.`;
  return null;
}

function IncomingChallanForm({ onDone }: { onDone: () => void }) {
  const exhibitions = useExhibitionsList();
  const warehouses = useWarehouses();
  const transporters = useTransporters();

  const [exhibitionId, setExhibitionId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const pending = usePendingItems(warehouseId, exhibitionId);

  const [rows, setRows] = useState<ItemRow[]>([]);
  const [transporterId, setTransporterId] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [purposeRows, setPurposeRows] = useState<DealPurpose[]>([{ purpose: "transportation", amount: 0 }]);
  const [remarks, setRemarks] = useState("");

  const save = useChallanMutation("incoming", createIncomingChallan);

  const pendingItems = useMemo(() => pending.data?.items.filter((i) => i.pending_quantity > 0) ?? [], [pending.data]);

  // (Re)build the editable rows whenever the pending list for this
  // warehouse+exhibition changes, keeping any quantities already typed.
  const rowsKey = pendingItems.map((i) => i.product_id).join(",");
  const [lastRowsKey, setLastRowsKey] = useState("");
  if (rowsKey !== lastRowsKey) {
    setLastRowsKey(rowsKey);
    setRows(pendingItems.map((i) => ({ productId: i.product_id, name: i.product_name, max: i.pending_quantity, quantity: "", lost: "", dead: "" })));
  }

  function updateRow(i: number, patch: Partial<ItemRow>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function updatePurpose(i: number, patch: Partial<DealPurpose>) {
    setPurposeRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  // Returned (back on the shelf), lost and dead are separate counts. Together
  // they're what this challan accounts for, which can't exceed what's pending.
  const activeRows = rows.filter((r) => rowTotal(r) > 0);
  const rowErrors = activeRows.some((r) => rowProblem(r) !== null);
  const purposeNames = purposeRows.map((r) => r.purpose.trim().toLowerCase());
  const purposesValid = purposeRows.every((r) => r.purpose.trim() && Number(r.amount) > 0) && new Set(purposeNames).size === purposeNames.length;
  const valid = Boolean(exhibitionId && warehouseId && transporterId && vehicleNo.trim()) && activeRows.length > 0 && !rowErrors && purposesValid;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    // The API's `quantity` is everything accounted for on this challan
    // (returned + lost + dead); it works out what's back on the shelf itself.
    const items: IncomingItemInput[] = activeRows.map((r) => ({
      item_id: r.productId,
      quantity: rowTotal(r),
      lost: Number(r.lost || 0) || undefined,
      dead: Number(r.dead || 0) || undefined,
    }));
    save.mutate(
      {
        exhibition_id: exhibitionId,
        from_warehouse: warehouseId,
        transporter_id: transporterId,
        vehicle_no: vehicleNo.trim(),
        items,
        purposes: purposeRows.map((r) => ({ purpose: r.purpose.trim(), amount: Number(r.amount) })),
        remarks: remarks.trim() || undefined,
      },
      { onSuccess: onDone },
    );
  }

  const noPending = pending.error instanceof ApiError && pending.error.status === 404;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Exhibition">
          {(id) => (
            <Select id={id} required value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} disabled={exhibitions.isPending}>
              <option value="">{exhibitions.isPending ? "Loading…" : "Select exhibition"}</option>
              {exhibitions.data?.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Warehouse it's returning to">
          {(id) => (
            <Select id={id} required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={warehouses.isPending}>
              <option value="">{warehouses.isPending ? "Loading…" : "Select warehouse"}</option>
              {warehouses.data?.map((w) => (
                <option key={w._id} value={w._id}>
                  {warehouseLabel(w)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Items still pending</h3>
        {!exhibitionId || !warehouseId ? (
          <p className="text-sm text-muted">Pick an exhibition and warehouse first.</p>
        ) : pending.isPending ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : noPending || pendingItems.length === 0 ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-warn">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Nothing is pending for this warehouse and exhibition — nothing was ever sent, or it&apos;s all already back.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row, i) => {
              const total = rowTotal(row);
              const problem = rowProblem(row);
              return (
                <div key={row.productId} className="rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="text-muted">{fmt(row.max)} pending</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Field label="Returned">{(id) => <Input id={id} type="number" inputMode="numeric" min={0} max={row.max} value={row.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} />}</Field>
                    <Field label="Lost">{(id) => <Input id={id} type="number" inputMode="numeric" min={0} max={row.max} value={row.lost} onChange={(e) => updateRow(i, { lost: e.target.value })} />}</Field>
                    <Field label="Dead">{(id) => <Input id={id} type="number" inputMode="numeric" min={0} max={row.max} value={row.dead} onChange={(e) => updateRow(i, { dead: e.target.value })} />}</Field>
                  </div>
                  {problem ? (
                    <p className="mt-1 text-xs text-danger">{problem}</p>
                  ) : total > 0 ? (
                    <p className="mt-1 text-xs text-muted">
                      {fmt(total)} of {fmt(row.max)} accounted for{total < row.max ? `, ${fmt(row.max - total)} still pending after this` : ""}.
                    </p>
                  ) : null}
                </div>
              );
            })}
            <p className="text-xs text-muted">Returned + lost + dead can&apos;t be more than what&apos;s pending. Leave all three empty to skip an item.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Transporter">
          {(id) => (
            <Select id={id} required value={transporterId} onChange={(e) => setTransporterId(e.target.value)} disabled={transporters.isPending}>
              <option value="">{transporters.isPending ? "Loading…" : "Select transporter"}</option>
              {transporters.data?.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.transporter_name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Vehicle number">{(id) => <Input id={id} required value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. DL 1AB 2345" />}</Field>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Trip charge for the transporter</h3>
        {purposeRows.map((row, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field label={i === 0 ? "Purpose" : ""} className="flex-1">
              {(id) => <Input id={id} required list="incoming-purposes" value={row.purpose} onChange={(e) => updatePurpose(i, { purpose: e.target.value })} />}
            </Field>
            <Field label={i === 0 ? "Amount" : ""} className="w-32">
              {(id) => <Input id={id} type="number" inputMode="numeric" required min={1} value={row.amount || ""} onChange={(e) => updatePurpose(i, { amount: Number(e.target.value) })} />}
            </Field>
            {purposeRows.length > 1 && (
              <Button type="button" variant="ghost" className="mb-0.5 h-10 px-2 text-danger" onClick={() => setPurposeRows((r) => r.filter((_, idx) => idx !== i))} aria-label="Remove purpose">
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        ))}
        <datalist id="incoming-purposes">
          {COMMON_PURPOSES.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <Button type="button" variant="secondary" className="self-start" onClick={() => setPurposeRows((r) => [...r, { purpose: "", amount: 0 }])}>
          <Plus className="size-4" aria-hidden />
          Add another purpose
        </Button>
        {purposeRows.some((r) => Number(r.amount) > 0) && (
          <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
            Trip total: <span className="font-semibold tabular-nums">{fmtMoney(purposeRows.reduce((s, r) => s + (Number(r.amount) || 0), 0))}</span>
          </div>
        )}
      </div>

      <Field label="Remarks (optional)">{(id) => <Textarea id={id} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          Add challan
        </Button>
      </div>
    </form>
  );
}
