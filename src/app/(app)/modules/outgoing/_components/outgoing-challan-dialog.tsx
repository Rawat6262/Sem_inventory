"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { challanPrintHref, createOutgoingChallan, fmt, useChallanMutation, useExhibitionsList, type DealPurpose, type OutgoingItemInput } from "@/lib/challans";
import { available, useProducts, useWarehouses, warehouseLabel } from "@/lib/stock";
import { fmtMoney } from "@/lib/transactions";
import { useTransporters } from "@/lib/transport";

type Props = { open: boolean; onClose: () => void };

const COMMON_PURPOSES = ["transportation", "loading", "unloading", "other"];

export function OutgoingChallanDialog({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Add outgoing challan" description="Goods leaving a warehouse for an exhibition.">
      {open && <OutgoingChallanForm onDone={onClose} />}
    </Modal>
  );
}

type ItemRow = { productId: string; quantity: string; hsn: string };
const EMPTY_ROW: ItemRow = { productId: "", quantity: "", hsn: "" };

function OutgoingChallanForm({ onDone }: { onDone: () => void }) {
  const exhibitions = useExhibitionsList();
  const warehouses = useWarehouses();
  const products = useProducts();
  const transporters = useTransporters();

  const [exhibitionId, setExhibitionId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [transporterId, setTransporterId] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [itemRows, setItemRows] = useState<ItemRow[]>([EMPTY_ROW]);
  const [purposeRows, setPurposeRows] = useState<DealPurpose[]>([{ purpose: "transportation", amount: 0 }]);
  const [remarks, setRemarks] = useState("");
  const [goodsValue, setGoodsValue] = useState("");
  const router = useRouter();

  const save = useChallanMutation("outgoing", createOutgoingChallan);

  const availableProducts = useMemo(
    () => (products.data ?? []).filter((p) => p.warehouse === warehouseId && available(p) > 0),
    [products.data, warehouseId],
  );
  const chosenIds = new Set(itemRows.map((r) => r.productId).filter(Boolean));

  function updateItem(i: number, patch: Partial<ItemRow>) {
    setItemRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function updatePurpose(i: number, patch: Partial<DealPurpose>) {
    setPurposeRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const itemsValid =
    itemRows.length > 0 &&
    itemRows.every((r) => {
      if (!r.productId || !r.quantity) return false;
      const p = availableProducts.find((x) => x._id === r.productId);
      const q = Number(r.quantity);
      return p && q > 0 && q <= available(p);
    });
  const purposeNames = purposeRows.map((r) => r.purpose.trim().toLowerCase());
  const purposesValid = purposeRows.every((r) => r.purpose.trim() && Number(r.amount) > 0) && new Set(purposeNames).size === purposeNames.length;
  const goodsValueValid = goodsValue === "" || Number(goodsValue) >= 0;
  const valid = Boolean(exhibitionId && warehouseId && transporterId && vehicleNo.trim()) && itemsValid && purposesValid && goodsValueValid;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const items: OutgoingItemInput[] = itemRows.map((r) => ({ item_id: r.productId, quantity: Number(r.quantity), hsn_code: r.hsn.trim() || undefined }));
    save.mutate(
      {
        exhibition_id: exhibitionId,
        from_warehouse: warehouseId,
        transporter_id: transporterId,
        vehicle_no: vehicleNo.trim(),
        items,
        purposes: purposeRows.map((r) => ({ purpose: r.purpose.trim(), amount: Number(r.amount) })),
        remarks: remarks.trim() || undefined,
        goods_value: goodsValue === "" ? undefined : Number(goodsValue),
      },
      {
        // Straight to the printable transport letter + delivery challan.
        onSuccess: (res) => {
          onDone();
          router.push(challanPrintHref("outgoing", res.data._id, true));
        },
      },
    );
  }

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
        <Field label="From warehouse">
          {(id) => (
            <Select
              id={id}
              required
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setItemRows([EMPTY_ROW]);
              }}
              disabled={warehouses.isPending}
            >
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
        <Field
          label="Transporter"
          hint={
            transporters.data && transporters.data.length === 0 ? (
              <>No transporters yet — add one in the Transport module first.</>
            ) : undefined
          }
        >
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
        <h3 className="text-sm font-medium">Items</h3>
        {!warehouseId ? (
          <p className="text-sm text-muted">Pick a warehouse first.</p>
        ) : availableProducts.length === 0 ? (
          <p className="text-sm text-muted">Nothing on the shelf in this warehouse.</p>
        ) : (
          itemRows.map((row, i) => {
            const chosen = availableProducts.find((p) => p._id === row.productId);
            const max = chosen ? available(chosen) : 0;
            const qty = Number(row.quantity);
            const qtyInvalid = row.quantity !== "" && (qty <= 0 || qty > max);
            return (
              <div key={i} className="flex items-end gap-2">
                <Field label={i === 0 ? "Product" : ""} className="flex-1">
                  {(id) => (
                    <Select
                      id={id}
                      required
                      value={row.productId}
                      onChange={(e) => updateItem(i, { productId: e.target.value, quantity: "", hsn: availableProducts.find((p) => p._id === e.target.value)?.hsn_code ?? "" })}
                    >
                      <option value="">Select product</option>
                      {availableProducts
                        .filter((p) => p._id === row.productId || !chosenIds.has(p._id))
                        .map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({fmt(available(p))} {p.unit} available)
                          </option>
                        ))}
                    </Select>
                  )}
                </Field>
                <Field label={i === 0 ? "HSN code" : ""} className="w-24">
                  {(id) => <Input id={id} inputMode="numeric" maxLength={10} disabled={!chosen} value={row.hsn} onChange={(e) => updateItem(i, { hsn: e.target.value })} placeholder="—" />}
                </Field>
                <Field label={i === 0 ? "Quantity" : ""} className="w-28">
                  {(id) => (
                    <Input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      required
                      min={1}
                      max={max || undefined}
                      disabled={!chosen}
                      value={row.quantity}
                      onChange={(e) => updateItem(i, { quantity: e.target.value })}
                      aria-invalid={qtyInvalid || undefined}
                    />
                  )}
                </Field>
                {itemRows.length > 1 && (
                  <Button type="button" variant="ghost" className="mb-0.5 h-10 px-2 text-danger" onClick={() => setItemRows((r) => r.filter((_, idx) => idx !== i))} aria-label="Remove item">
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            );
          })
        )}
        {availableProducts.length > itemRows.length && (
          <Button type="button" variant="secondary" className="self-start" onClick={() => setItemRows((r) => [...r, EMPTY_ROW])}>
            <Plus className="size-4" aria-hidden />
            Add another item
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Trip charge for the transporter</h3>
        {purposeRows.map((row, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field label={i === 0 ? "Purpose" : ""} className="flex-1">
              {(id) => <Input id={id} required list="outgoing-purposes" value={row.purpose} onChange={(e) => updatePurpose(i, { purpose: e.target.value })} />}
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
        <datalist id="outgoing-purposes">
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

      <Field label="Total value of goods (optional)" hint="Printed on the delivery challan, in rupees." className="sm:w-64">
        {(id) => <Input id={id} type="number" inputMode="numeric" min={0} value={goodsValue} onChange={(e) => setGoodsValue(e.target.value)} placeholder="e.g. 178500" aria-invalid={!goodsValueValid || undefined} />}
      </Field>

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
