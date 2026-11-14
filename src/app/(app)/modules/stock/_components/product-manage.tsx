"use client";

import { ArrowLeftRight, Pencil, PackageCheck, SearchCheck, Skull, TriangleAlert, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, cn, Field, Input, Textarea } from "@/components/ui";
import {
  actionLimit,
  available,
  categoryName,
  fmt,
  PRODUCT_ACTIONS,
  runProductAction,
  useCategories,
  useStockMutation,
  useWarehouses,
  vendorName,
  warehouseLabel,
  type Product,
  type ProductAction,
} from "@/lib/stock";
import { ProductDialog } from "./product-dialog";
import { TransferForm } from "./transfer-form";

type View = "overview" | "transfer" | ProductAction;

const ACTION_ICONS: Record<ProductAction, ReactNode> = {
  lost: <TriangleAlert className="size-4" aria-hidden />,
  "find-lost": <SearchCheck className="size-4" aria-hidden />,
  dead: <Skull className="size-4" aria-hidden />,
  repair: <Wrench className="size-4" aria-hidden />,
  "repair-return": <PackageCheck className="size-4" aria-hidden />,
};

// One place to see a product's numbers and change them: edit, transfer,
// lost / found, dead, repair / back from repair.
export function ProductManageDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [view, setView] = useState<View>("overview");
  const [editing, setEditing] = useState(false);
  const categories = useCategories();
  const warehouses = useWarehouses();

  const close = () => {
    setView("overview");
    onClose();
  };

  if (editing && product) {
    return (
      <ProductDialog
        open
        product={product}
        onClose={() => {
          setEditing(false);
          close();
        }}
      />
    );
  }

  const p = product;
  const title = !p ? "" : view === "overview" ? p.name : view === "transfer" ? `Transfer ${p.name}` : `${PRODUCT_ACTIONS[view].label}: ${p.name}`;

  return (
    <Modal
      open={Boolean(p)}
      onClose={close}
      title={title}
      description={p && view === "overview" ? `${categoryName(p.category, categories.data)} · ${warehouseLabel(warehouses.data?.find((w) => w._id === p.warehouse))}` : undefined}
    >
      {p && view === "overview" && (
        <>
          <Breakdown product={p} />
          {(vendorName(p.vendor) || p.remark) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {vendorName(p.vendor) && (
                <>
                  <dt className="text-muted">Vendor</dt>
                  <dd>{vendorName(p.vendor)}</dd>
                </>
              )}
              {p.remark && (
                <>
                  <dt className="text-muted">Last remark</dt>
                  <dd className="break-words">{p.remark}</dd>
                </>
              )}
            </dl>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ActionButton icon={<Pencil className="size-4" aria-hidden />} onClick={() => setEditing(true)}>
              Edit details
            </ActionButton>
            <ActionButton icon={<ArrowLeftRight className="size-4" aria-hidden />} onClick={() => setView("transfer")} disabled={available(p) === 0}>
              Transfer to another warehouse
            </ActionButton>
            {(Object.keys(PRODUCT_ACTIONS) as ProductAction[]).map((a) => (
              <ActionButton key={a} icon={ACTION_ICONS[a]} onClick={() => setView(a)} disabled={actionLimit(p, a) === 0}>
                {PRODUCT_ACTIONS[a].label}
              </ActionButton>
            ))}
          </div>
        </>
      )}

      {p && view === "transfer" && <TransferForm product={p} onDone={close} onCancel={() => setView("overview")} />}

      {p && view !== "overview" && view !== "transfer" && (
        <QuantityAction key={view} product={p} action={view} onDone={close} onBack={() => setView("overview")} />
      )}
    </Modal>
  );
}

function ActionButton({ icon, children, onClick, disabled }: { icon: ReactNode; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-left text-sm font-medium hover:border-accent/50 hover:bg-accent-soft/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-transparent"
    >
      <span className="text-muted">{icon}</span>
      {children}
    </button>
  );
}

/** Where every unit of this product is right now. */
export function Breakdown({ product: p }: { product: Product }) {
  const rows: { label: string; n: number; tone?: string }[] = [
    { label: "On the shelf", n: available(p), tone: "text-accent" },
    { label: "Out for exhibition", n: p.out_for_exhibition },
    { label: "In repair", n: p.repair_item, tone: "text-warn" },
    { label: "Lost", n: p.lost, tone: "text-danger" },
    { label: "Dead (damaged)", n: p.dead, tone: "text-danger" },
  ];
  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-baseline justify-between border-b border-line px-3 py-2">
        <span className="text-sm text-muted">Total owned</span>
        <span className="font-semibold tabular-nums">
          {fmt(p.no_of_item)} <span className="text-sm font-normal text-muted">{p.unit}</span>
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-5">
        {rows.map((r) => (
          <div key={r.label} className="bg-surface px-3 py-2">
            <dt className="text-xs text-muted">{r.label}</dt>
            <dd className={cn("font-semibold tabular-nums", r.n > 0 ? r.tone : "text-muted/60")}>{fmt(r.n)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function QuantityAction({ product, action, onDone, onBack }: { product: Product; action: ProductAction; onDone: () => void; onBack: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [remark, setRemark] = useState("");
  const run = useStockMutation(runProductAction);
  const max = actionLimit(product, action);
  const qty = Number(quantity);
  const invalid = quantity !== "" && (qty < 1 || qty > max || !Number.isInteger(qty));
  const hint = {
    lost: "Takes units off the shelf. You can bring them back with Found lost items.",
    "find-lost": "Puts found units back on the shelf.",
    dead: "Damaged beyond use. Takes units off the shelf for good.",
    repair: "Takes units off the shelf while they're being fixed.",
    "repair-return": "Puts repaired units back on the shelf.",
  }[action];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || !quantity) return;
    run.mutate({ id: product._id, action, quantity: qty, remark: remark.trim() }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm text-muted">{hint}</p>
      <Field label="Quantity" hint={`Up to ${fmt(max)} ${product.unit}`}>
        {(id) => (
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={max}
            autoFocus
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>
      {invalid && <p className="-mt-2 text-sm text-danger">Enter a whole number from 1 to {fmt(max)}.</p>}
      <Field label="Remark (optional)">
        {(id) => <Textarea id={id} rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="What happened?" />}
      </Field>
      {run.error && <Alert>{run.error.message}</Alert>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onBack} disabled={run.isPending}>
          Back
        </Button>
        <Button type="submit" loading={run.isPending} disabled={invalid || !quantity}>
          {PRODUCT_ACTIONS[action].verb}
        </Button>
      </div>
    </form>
  );
}
