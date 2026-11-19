"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  addProduct,
  committed,
  fmt,
  UNITS,
  updateProduct,
  useCategories,
  useStockMutation,
  useVendors,
  useWarehouses,
  warehouseLabel,
  type Product,
  type ProductInput,
} from "@/lib/stock";

type Props = {
  open: boolean;
  onClose: () => void;
  product?: Product | null; // edit when set, add otherwise
  warehouseId?: string; // preselect when adding from a warehouse page
};

export function ProductDialog({ open, onClose, product, warehouseId }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={product ? `Edit ${product.name}` : "Add product"}>
      {open && <ProductForm key={product?._id ?? "new"} product={product} warehouseId={warehouseId} onDone={onClose} />}
    </Modal>
  );
}

function vendorId(v: Product["vendor"]) {
  return v && typeof v === "object" ? v._id : (v ?? "");
}

function ProductForm({ product, warehouseId, onDone }: { product?: Product | null; warehouseId?: string; onDone: () => void }) {
  const warehouses = useWarehouses();
  const categories = useCategories();
  const vendors = useVendors();

  // Older products may store the category name; map it to the id when we can.
  const initialCategory =
    categories.data?.find((c) => c._id === product?.category || c.category.toLowerCase() === product?.category?.toLowerCase())?._id ??
    product?.category ??
    "";

  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: initialCategory,
    unit: product?.unit ?? "pcs",
    no_of_item: product ? String(product.no_of_item) : "",
    warehouse: product?.warehouse ?? warehouseId ?? "",
    vendor: vendorId(product?.vendor),
    hsn_code: product?.hsn_code ?? "",
    remark: product?.remark ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useStockMutation((input: ProductInput & { id?: string }) => {
    const { id, ...body } = input;
    return id ? updateProduct({ id, ...body }) : addProduct(body);
  });

  const minTotal = product ? committed(product) : 0;
  const total = Number(form.no_of_item);
  const tooLow = form.no_of_item !== "" && total < minTotal;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tooLow) return;
    save.mutate(
      {
        id: product?._id,
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        no_of_item: total,
        warehouse: form.warehouse,
        ...(form.vendor ? { vendor: form.vendor } : {}),
        hsn_code: form.hsn_code.trim(),
        ...(product ? { remark: form.remark.trim() } : {}),
      },
      { onSuccess: onDone },
    );
  }

  const noCategories = categories.data && categories.data.length === 0;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Product name">
        {(id) => <Input id={id} required value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Folding chair" />}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Category"
          hint={
            noCategories ? (
              <>
                No categories yet.{" "}
                <Link href="/modules/stock/categories" className="text-accent hover:underline">
                  Add one first
                </Link>
                .
              </>
            ) : undefined
          }
        >
          {(id) => (
            <Select id={id} required value={form.category} onChange={(e) => set("category")(e.target.value)} disabled={categories.isPending}>
              <option value="">{categories.isPending ? "Loading…" : "Select category"}</option>
              {categories.data?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.category}
                </option>
              ))}
              {/* Keep an unknown stored value selectable instead of silently dropping it. */}
              {form.category && categories.data && !categories.data.some((c) => c._id === form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
            </Select>
          )}
        </Field>
        <Field label="Unit">
          {(id) => (
            <Select id={id} required value={form.unit} onChange={(e) => set("unit")(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label={product ? "Total quantity owned" : "Quantity"}
          hint={product && minTotal > 0 ? `At least ${fmt(minTotal)}: that many are out, in repair, lost or dead.` : undefined}
        >
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              required
              min={product ? minTotal : 1}
              value={form.no_of_item}
              onChange={(e) => set("no_of_item")(e.target.value)}
              aria-invalid={tooLow || undefined}
            />
          )}
        </Field>
        <Field label="Warehouse">
          {(id) => (
            <Select id={id} required value={form.warehouse} onChange={(e) => set("warehouse")(e.target.value)} disabled={warehouses.isPending || Boolean(product)}>
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
      {product && <p className="-mt-2 text-xs text-muted">To move stock to another warehouse, use Transfer.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Vendor (optional)">
          {(id) => (
            <Select id={id} value={form.vendor} onChange={(e) => set("vendor")(e.target.value)} disabled={vendors.isPending}>
              <option value="">{vendors.isPending ? "Loading…" : "No vendor"}</option>
              {vendors.data?.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vendorName}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="HSN code (optional)" hint="Printed on delivery challans.">
          {(id) => <Input id={id} inputMode="numeric" maxLength={10} value={form.hsn_code} onChange={(e) => set("hsn_code")(e.target.value)} placeholder="e.g. 9403" />}
        </Field>
      </div>

      {product && (
        <Field label="Remark">{(id) => <Textarea id={id} rows={2} value={form.remark} onChange={(e) => set("remark")(e.target.value)} />}</Field>
      )}

      {save.error && <Alert>{save.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={tooLow}>
          {product ? "Save changes" : "Add product"}
        </Button>
      </div>
    </form>
  );
}
