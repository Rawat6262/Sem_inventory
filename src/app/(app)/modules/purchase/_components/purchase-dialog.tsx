"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea, todayInput } from "@/components/ui";
import { fmtMoney } from "@/components/data-ui";
import { useMe } from "@/hooks/use-me";
import { lineTotal, savePurchase, usePurchaseMutation, usePurchaseUsers, type Purchase, type PurchaseInput } from "@/lib/purchases";
import { ROLE_LABELS, isRole } from "@/lib/permissions";
import { fmt, UNITS, useCategories, useProducts, useVendors, useWarehouses, warehouseLabel, type Product } from "@/lib/stock";

type Props = { open: boolean; onClose: () => void; purchase?: Purchase | null };

export function PurchaseDialog({ open, onClose, purchase }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={purchase ? `Edit ${purchase.purchase_number}` : "Record a purchase"}
      description="Nothing is added to stock until someone presses Receive on this purchase."
    >
      {open && <PurchaseForm key={purchase?._id ?? "new"} purchase={purchase} onDone={onClose} />}
    </Modal>
  );
}

type Row = { name: string; category: string; unit: string; quantity: string; price: string };
const EMPTY_ROW: Row = { name: "", category: "", unit: "pcs", quantity: "", price: "" };

const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : todayInput());
const refId = (r: { _id: string } | null | undefined) => r?._id ?? "";

function PurchaseForm({ purchase, onDone }: { purchase?: Purchase | null; onDone: () => void }) {
  const router = useRouter();
  const me = useMe().data;
  const vendors = useVendors();
  const warehouses = useWarehouses();
  const categories = useCategories();
  const products = useProducts();
  const users = usePurchaseUsers();

  const [vendor, setVendor] = useState(refId(purchase?.vendor));
  const [warehouse, setWarehouse] = useState(refId(purchase?.warehouse));
  const [buyerPick, setBuyer] = useState(refId(purchase?.purchased_by));
  const buyer = buyerPick || me?._id || ""; // defaults to whoever is recording it
  const [date, setDate] = useState(toDateInput(purchase?.purchase_date));
  const [remarks, setRemarks] = useState(purchase?.remarks ?? "");
  const [rows, setRows] = useState<Row[]>(
    purchase?.items.map((it) => ({ name: it.name, category: it.category, unit: it.unit, quantity: String(it.quantity), price: String(it.price) })) ?? [EMPTY_ROW],
  );

  const save = usePurchaseMutation(savePurchase);

  // Products already in the chosen warehouse: an item with the same name is
  // added to that product on receive instead of becoming a duplicate.
  const inWarehouse = useMemo(() => (products.data ?? []).filter((p) => p.warehouse === warehouse), [products.data, warehouse]);
  const existingFor = (name: string): Product | undefined => {
    const n = name.trim().toLowerCase();
    return n ? inWarehouse.find((p) => p.name.trim().toLowerCase() === n) : undefined;
  };
  const categoryId = (p: Product) =>
    categories.data?.find((c) => c._id === p.category || c.category.toLowerCase() === p.category?.toLowerCase())?._id ?? p.category;

  // A different warehouse has different products: re-check every typed name.
  function changeWarehouse(id: string) {
    setWarehouse(id);
    const there = (products.data ?? []).filter((p) => p.warehouse === id);
    setRows((rs) =>
      rs.map((r) => {
        const ex = there.find((p) => p.name.trim().toLowerCase() === r.name.trim().toLowerCase());
        return ex ? { ...r, category: categoryId(ex), unit: ex.unit } : r;
      }),
    );
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, ...patch };
        // Typed the name of a product already in this warehouse: take its category and unit.
        if (patch.name !== undefined) {
          const ex = existingFor(patch.name);
          if (ex) return { ...next, category: categoryId(ex), unit: ex.unit };
        }
        return next;
      }),
    );
  }

  const names = rows.map((r) => r.name.trim().toLowerCase()).filter(Boolean);
  const duplicateName = names.find((n, i) => names.indexOf(n) !== i);
  const rowsValid = rows.every((r) => {
    const q = Number(r.quantity);
    const p = Number(r.price);
    return r.name.trim() && r.category && r.unit && Number.isInteger(q) && q >= 1 && r.price !== "" && p >= 0;
  });
  const valid = Boolean(vendor && warehouse && buyer && date) && rows.length > 0 && rowsValid && !duplicateName;
  const total = rows.reduce((s, r) => s + lineTotal({ quantity: Number(r.quantity), price: Number(r.price) }), 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const body: PurchaseInput & { id?: string } = {
      id: purchase?._id,
      vendor,
      warehouse,
      purchased_by: buyer,
      purchase_date: date,
      remarks: remarks.trim() || undefined,
      items: rows.map((r) => ({ name: r.name.trim(), category: r.category, unit: r.unit, quantity: Number(r.quantity), price: Number(r.price) })),
    };
    save.mutate(body, {
      onSuccess: (res) => {
        onDone();
        if (!purchase) router.push(`/modules/purchase/${res.data._id}`);
      },
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vendor (bought from)" hint={vendors.data && vendors.data.length === 0 ? "No vendors yet. An admin can add them in the Vendors module." : undefined}>
          {(id) => (
            <Select id={id} required value={vendor} onChange={(e) => setVendor(e.target.value)} disabled={vendors.isPending}>
              <option value="">{vendors.isPending ? "Loading…" : "Select vendor"}</option>
              {vendors.data?.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vendorName}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Purchased by">
          {(id) => (
            <Select id={id} required value={buyer} onChange={(e) => setBuyer(e.target.value)} disabled={users.isPending}>
              <option value="">{users.isPending ? "Loading…" : "Select person"}</option>
              {users.data?.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.full_name}
                  {u._id === me?._id ? " (you)" : ""} · {isRole(u.role) ? ROLE_LABELS[u.role] : u.role}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Goes into warehouse">
          {(id) => (
            <Select id={id} required value={warehouse} onChange={(e) => changeWarehouse(e.target.value)} disabled={warehouses.isPending}>
              <option value="">{warehouses.isPending ? "Loading…" : "Select warehouse"}</option>
              {warehouses.data?.map((w) => (
                <option key={w._id} value={w._id}>
                  {warehouseLabel(w)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Purchase date">{(id) => <Input id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">What was bought</h3>
        <datalist id="purchase-products">
          {inWarehouse.map((p) => (
            <option key={p._id} value={p.name} />
          ))}
        </datalist>
        {rows.map((row, i) => {
          const ex = warehouse ? existingFor(row.name) : undefined;
          return (
            <div key={i} className="rounded-lg border border-line p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_9rem_6rem]">
                <Field label="Item" className="col-span-2 sm:col-span-1">
                  {(id) => <Input id={id} required list="purchase-products" value={row.name} onChange={(e) => updateRow(i, { name: e.target.value })} placeholder={warehouse ? "Type or pick a product" : "Pick a warehouse first"} />}
                </Field>
                <Field label="Category">
                  {(id) => (
                    <Select id={id} required value={row.category} onChange={(e) => updateRow(i, { category: e.target.value })} disabled={Boolean(ex) || categories.isPending}>
                      <option value="">{categories.isPending ? "Loading…" : "Select"}</option>
                      {categories.data?.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.category}
                        </option>
                      ))}
                      {row.category && categories.data && !categories.data.some((c) => c._id === row.category) && <option value={row.category}>{row.category}</option>}
                    </Select>
                  )}
                </Field>
                <Field label="Unit">
                  {(id) => (
                    <Select id={id} required value={row.unit} onChange={(e) => updateRow(i, { unit: e.target.value })} disabled={Boolean(ex)}>
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[8rem_9rem_1fr_auto]">
                <Field label="Quantity">
                  {(id) => <Input id={id} type="number" inputMode="numeric" required min={1} step={1} value={row.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} />}
                </Field>
                <Field label="Price per unit (₹)">
                  {(id) => <Input id={id} type="number" inputMode="decimal" required min={0} step="any" value={row.price} onChange={(e) => updateRow(i, { price: e.target.value })} />}
                </Field>
                <p className="hidden pb-2.5 text-sm text-muted sm:block">
                  = <span className="font-medium text-ink tabular-nums">{fmtMoney(lineTotal({ quantity: Number(row.quantity), price: Number(row.price) }))}</span>
                </p>
                {rows.length > 1 ? (
                  <Button type="button" variant="ghost" className="mb-0.5 h-10 px-2 text-danger" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} aria-label={`Remove ${row.name || "item"}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : (
                  <span />
                )}
              </div>
              {row.name.trim() && warehouse && (
                <p className="mt-2 text-xs text-muted">
                  {ex ? `Already in this warehouse: on receive, adds to it (${fmt(ex.no_of_item)} ${ex.unit} now).` : "Not in this warehouse yet: on receive, it's added as a new product."}
                </p>
              )}
            </div>
          );
        })}
        {duplicateName && <p className="text-xs text-danger">An item is listed twice. Put it on one line with the total quantity.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="secondary" onClick={() => setRows((rs) => [...rs, EMPTY_ROW])}>
            <Plus className="size-4" aria-hidden />
            Add another item
          </Button>
          <p className="text-sm">
            Total: <span className="font-semibold tabular-nums">{fmtMoney(total)}</span>
          </p>
        </div>
      </div>

      <Field label="Remarks (optional)">{(id) => <Textarea id={id} rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />}</Field>

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid}>
          {purchase ? "Save changes" : "Record purchase"}
        </Button>
      </div>
    </form>
  );
}
