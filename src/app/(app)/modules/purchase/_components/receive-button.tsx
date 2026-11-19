"use client";

import { PackageCheck } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button } from "@/components/ui";
import { receivePurchase, usePurchaseMutation, type Purchase } from "@/lib/purchases";
import { fmt, useProducts, warehouseLabel } from "@/lib/stock";

/**
 * "Receive" for a pending purchase. Anyone can use it, but only after
 * confirming: receiving adds the items to stock and can't be undone.
 */
export function ReceiveButton({ purchase, compact }: { purchase: Purchase; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  if (purchase.status !== "pending") return null;
  return (
    <>
      <Button variant={compact ? "secondary" : "primary"} className={compact ? "h-8 px-2.5" : undefined} onClick={() => setOpen(true)}>
        <PackageCheck className={compact ? "size-3.5" : "size-4"} aria-hidden />
        Receive
      </Button>
      {open && <ReceiveDialog purchase={purchase} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReceiveDialog({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const receive = usePurchaseMutation((id: string) => receivePurchase(id));
  const products = useProducts();
  const warehouseId = purchase.warehouse?._id;
  const inWarehouse = (products.data ?? []).filter((p) => p.warehouse === warehouseId);
  const match = (name: string) => inWarehouse.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());

  return (
    <Modal
      open
      onClose={receive.isPending ? () => {} : onClose}
      title={`Receive ${purchase.purchase_number} into stock?`}
      description={
        <>
          These items will be added to <strong className="text-ink">{warehouseLabel(purchase.warehouse)}</strong>. This can&apos;t be undone.
        </>
      }
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={receive.isPending}>
            Cancel
          </Button>
          <Button type="button" loading={receive.isPending} onClick={() => receive.mutate(purchase._id, { onSuccess: onClose })}>
            <PackageCheck className="size-4" aria-hidden />
            Yes, receive into stock
          </Button>
        </>
      }
    >
      <ul className="divide-y divide-line rounded-lg border border-line text-sm">
        {purchase.items.map((it) => {
          const existing = products.data ? match(it.name) : undefined;
          return (
            <li key={it._id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="font-medium">{it.name}</span>
                <span className="block text-xs text-muted">
                  {products.isPending
                    ? "Checking stock…"
                    : products.error
                      ? "Matched to stock by name when received"
                      : existing
                      ? `Adds to the existing product (${fmt(existing.no_of_item)} ${existing.unit} now)`
                      : "New product in this warehouse"}
                </span>
              </span>
              <span className="shrink-0 tabular-nums font-medium">
                +{fmt(it.quantity)} {it.unit}
              </span>
            </li>
          );
        })}
      </ul>
      {receive.error && (
        <div className="mt-3">
          <Alert>{receive.error.message}</Alert>
        </div>
      )}
    </Modal>
  );
}
