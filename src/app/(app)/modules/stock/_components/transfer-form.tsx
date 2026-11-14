"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import {
  available,
  fmt,
  transferProduct,
  useProducts,
  useStockMutation,
  useWarehouses,
  warehouseLabel,
  type Product,
  type TransferInput,
} from "@/lib/stock";

type Props = {
  /** Lock the form to one product (opened from a product). */
  product?: Product | null;
  /** Start with this source warehouse selected. */
  presetFrom?: string;
  onDone?: () => void;
  onCancel?: () => void;
};

// Moves units of a product from one warehouse to another. The backend moves
// them in one database transaction and records who did it.
export function TransferForm({ product, presetFrom, onDone, onCancel }: Props) {
  const { data: me } = useMe();
  const warehouses = useWarehouses();
  const products = useProducts();

  const [from, setFrom] = useState(product?.warehouse ?? presetFrom ?? "");
  const [productId, setProductId] = useState(product?._id ?? "");
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const transfer = useStockMutation((input: TransferInput) => transferProduct(input));

  const inSource = (products.data ?? []).filter((p) => p.warehouse === from && available(p) > 0).sort((a, b) => a.name.localeCompare(b.name));
  const selected = product ?? products.data?.find((p) => p._id === productId) ?? null;
  const max = selected ? available(selected) : 0;
  const qty = Number(quantity);
  const qtyError = quantity !== "" && (qty < 1 || qty > max) ? `Enter 1 to ${fmt(max)}.` : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || qtyError) return;
    setDone(null);
    transfer.mutate(
      { productId: selected._id, fromWarehouseId: from, toWarehouseId: to, quantity: qty, transferredBy: me?._id },
      {
        onSuccess: () => {
          const toName = warehouseLabel(warehouses.data?.find((w) => w._id === to));
          setDone(`Moved ${fmt(qty)} ${selected.unit} of ${selected.name} to ${toName}.`);
          setQuantity("");
          if (!product) setProductId("");
          onDone?.();
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <Field label="From warehouse">
          {(id) => (
            <Select
              id={id}
              required
              value={from}
              disabled={Boolean(product) || warehouses.isPending}
              onChange={(e) => {
                setFrom(e.target.value);
                setProductId("");
                if (e.target.value === to) setTo("");
              }}
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
        <ArrowRight className="mb-2.5 hidden size-5 text-muted sm:block" aria-hidden />
        <Field label="To warehouse">
          {(id) => (
            <Select id={id} required value={to} onChange={(e) => setTo(e.target.value)} disabled={warehouses.isPending}>
              <option value="">Select warehouse</option>
              {warehouses.data
                ?.filter((w) => w._id !== from)
                .map((w) => (
                  <option key={w._id} value={w._id}>
                    {warehouseLabel(w)}
                  </option>
                ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label="Product" hint={from && !product && inSource.length === 0 && !products.isPending ? "Nothing on the shelf in this warehouse." : undefined}>
          {(id) =>
            product ? (
              <Input id={id} value={product.name} disabled />
            ) : (
              <Select id={id} required value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!from || products.isPending}>
                <option value="">{from ? "Select product" : "Pick a warehouse first"}</option>
                {inSource.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({fmt(available(p))} {p.unit} available)
                  </option>
                ))}
              </Select>
            )
          }
        </Field>
        <Field label="Quantity" hint={selected ? `Up to ${fmt(max)} ${selected.unit}` : undefined}>
          {(id) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={max || undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!selected || max === 0}
              aria-invalid={Boolean(qtyError) || undefined}
            />
          )}
        </Field>
      </div>

      {qtyError && <p className="-mt-2 text-sm text-danger">{qtyError}</p>}
      {transfer.error && <Alert>{transfer.error.message}</Alert>}
      {done && !transfer.error && <Alert tone="success">{done}</Alert>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={transfer.isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={transfer.isPending} disabled={!selected || !to || Boolean(qtyError) || !quantity}>
          Transfer
        </Button>
      </div>
    </form>
  );
}
