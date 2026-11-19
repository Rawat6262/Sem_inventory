"use client";

import { Pencil, SearchX, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { BackLink, EmptyState, QueryState, Section, StatTile, TableWrap, fmtMoney, td, th } from "@/components/data-ui";
import { Button } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";
import { canChangePurchase, deletePurchase, lineTotal, usePurchase, usePurchaseMutation } from "@/lib/purchases";
import { fmt, fmtDate, useCategories, warehouseLabel } from "@/lib/stock";
import { PurchaseDialog } from "../_components/purchase-dialog";
import { ReceiveButton } from "../_components/receive-button";
import { StatusBadge } from "../purchases-view";

export function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const purchase = usePurchase(id);
  const meQuery = useMe();
  const me = meQuery.data;
  const categories = useCategories();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = usePurchaseMutation((pid: string) => deletePurchase(pid));

  if (purchase.error instanceof ApiError && [400, 404].includes(purchase.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Purchase not found" action={<BackLink href="/modules/purchase">Back to purchases</BackLink>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  const categoryName = (idOrName: string) => categories.data?.find((c) => c._id === idOrName)?.category ?? idOrName;

  return (
    <QueryState queries={[purchase, meQuery]}>
      {() => {
        const p = purchase.data!;
        const editable = Boolean(me && canChangePurchase(me, p));
        return (
          <>
            <BackLink href="/modules/purchase">← All purchases</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  {p.purchase_number} <StatusBadge status={p.status} />
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {fmtDate(p.purchase_date)} · from <span className="text-ink">{p.vendor?.vendorName ?? "—"}</span> · bought by{" "}
                  <span className="text-ink">{p.purchased_by?.full_name ?? "—"}</span> · into <span className="text-ink">{warehouseLabel(p.warehouse)}</span>
                </p>
                {p.status === "received" ? (
                  <p className="mt-1 text-sm text-success">
                    Received into stock by {p.received_by?.full_name ?? "—"} on {fmtDate(p.received_at)}.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-warn">Not in stock yet. Press Receive once the goods have arrived.</p>
                )}
                {p.remarks && <p className="mt-2 text-sm text-muted">{p.remarks}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <ReceiveButton purchase={p} />
                {editable && (
                  <>
                    <Button variant="secondary" onClick={() => setEditing(true)}>
                      <Pencil className="size-4" aria-hidden />
                      Edit
                    </Button>
                    <Button variant="secondary" className="hover:text-danger" onClick={() => setDeleting(true)}>
                      <Trash2 className="size-4" aria-hidden />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatTile label="Items" value={fmt(p.items.length)} />
              <StatTile label="Units" value={fmt(p.items.reduce((s, it) => s + it.quantity, 0))} />
              <StatTile label="Total" value={fmtMoney(p.total_amount)} tone="accent" />
            </div>

            <Section title="What was bought">
              <TableWrap>
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-surface-2/50">
                    <tr>
                      <th className={th}>Item</th>
                      <th className={th}>Category</th>
                      <th className={`${th} text-right`}>Quantity</th>
                      <th className={`${th} text-right`}>Price / unit</th>
                      <th className={`${th} text-right`}>Amount</th>
                      {p.status === "received" && <th className={th}>In stock</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {p.items.map((it) => {
                      const product = it.product && typeof it.product === "object" ? it.product : null;
                      return (
                        <tr key={it._id}>
                          <td className={`${td} font-medium`}>{it.name}</td>
                          <td className={`${td} text-muted`}>{categoryName(it.category)}</td>
                          <td className={`${td} text-right tabular-nums`}>
                            {fmt(it.quantity)} {it.unit}
                          </td>
                          <td className={`${td} text-right tabular-nums`}>{fmtMoney(it.price)}</td>
                          <td className={`${td} text-right tabular-nums`}>{fmtMoney(lineTotal(it))}</td>
                          {p.status === "received" && (
                            <td className={`${td} text-muted`}>
                              {it.stock_action === "created" ? "Added as a new product" : "Added to the existing product"}
                              {product && p.warehouse && (
                                <>
                                  {" · "}
                                  <Link href={`/modules/stock/warehouses/${p.warehouse._id}`} className="text-accent hover:underline">
                                    {fmt(product.no_of_item)} {product.unit} now
                                  </Link>
                                </>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            </Section>

            <p className="mt-4 text-xs text-muted">Recorded by {p.createdBy?.full_name ?? "—"} on {fmtDate(p.createdAt)}.</p>

            <PurchaseDialog open={editing} purchase={editing ? p : null} onClose={() => setEditing(false)} />

            <ConfirmDialog
              open={deleting}
              title={`Delete ${p.purchase_number}?`}
              confirmLabel="Delete purchase"
              pending={remove.isPending}
              error={remove.error?.message}
              onClose={() => {
                setDeleting(false);
                remove.reset();
              }}
              onConfirm={() => remove.mutate(p._id, { onSuccess: () => router.push("/modules/purchase") })}
            >
              It hasn&apos;t been received, so stock isn&apos;t affected. This can&apos;t be undone.
            </ConfirmDialog>
          </>
        );
      }}
    </QueryState>
  );
}
