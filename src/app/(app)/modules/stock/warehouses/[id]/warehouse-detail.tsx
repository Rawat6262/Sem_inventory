"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, MapPin, Pencil, Plus, SearchX } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";
import { canEditStock } from "@/lib/permissions";
import {
  fmt,
  fmtDate,
  useCategories,
  useProducts,
  useWarehouseSummary,
  useWarehouses,
  warehouseLabel,
} from "@/lib/stock";
import { ProductDialog } from "../../_components/product-dialog";
import { ProductTable } from "../../_components/product-table";
import { BackLink, Count, EmptyState, QueryState, Section, StatTile, TableWrap, td, th } from "../../_components/stock-ui";
import { TransferForm } from "../../_components/transfer-form";
import { WarehouseDialog } from "../../_components/warehouse-dialog";

export function WarehouseDetail() {
  const { id } = useParams<{ id: string }>();
  const summary = useWarehouseSummary(id);
  const warehouses = useWarehouses();
  const products = useProducts();
  const categories = useCategories();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const me = useMe().data;

  if (summary.error instanceof ApiError && [400, 404].includes(summary.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Warehouse not found" action={<BackLink href="/modules/stock">Back to warehouses</BackLink>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  return (
    <QueryState queries={[summary, warehouses, products, categories]}>
      {() => {
        const s = summary.data!;
        const w = warehouses.data!.find((x) => x._id === id);
        const here = products.data!.filter((p) => p.warehouse === id);
        const t = s.stockTotals;
        const activity = s.exhibitionActivity;

        return (
          <>
            <BackLink href="/modules/stock">← All warehouses</BackLink>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{warehouseLabel(s.warehouse)}</h2>
                <p className="mt-1 flex items-start gap-1 text-sm text-muted">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {[s.warehouse.address, s.warehouse.city, s.warehouse.state, s.warehouse.country].filter(Boolean).join(", ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {me && w && canEditStock(me, w.createdBy) && (
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setTransferring(true)} disabled={here.length === 0 || (warehouses.data?.length ?? 0) < 2}>
                  <ArrowLeftRight className="size-4" aria-hidden />
                  Transfer
                </Button>
                <Button onClick={() => setAdding(true)}>
                  <Plus className="size-4" aria-hidden />
                  Add product
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Total owned" value={fmt(t.no_of_item)} hint={`${fmt(here.length)} products`} />
              <StatTile label="On the shelf" value={fmt(t.total_no)} tone="accent" />
              <StatTile label="Out for exhibition" value={fmt(t.out_for_exhibition)} />
              <StatTile label="In repair" value={fmt(t.repair_item)} tone={t.repair_item ? "warn" : undefined} />
              <StatTile label="Lost" value={fmt(t.lost)} tone={t.lost ? "danger" : undefined} />
              <StatTile label="Dead" value={fmt(t.dead)} tone={t.dead ? "danger" : undefined} />
            </div>

            <Section title="Products" description="Everything stored in this warehouse.">
              <ProductTable products={here} categories={categories.data!} warehouses={warehouses.data!} singleWarehouse />
            </Section>

            <Section
              title="At exhibitions"
              description="Stock sent from here on outgoing challans, and what has come back."
            >
              {activity.byExhibition.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">
                  Nothing has been sent to an exhibition from this warehouse yet.
                </p>
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                    <StatTile label="Sent" value={fmt(activity.totals.total_sent)} />
                    <StatTile label="Returned" value={fmt(activity.totals.total_returned)} />
                    <StatTile label="Still out" value={fmt(activity.totals.still_pending)} tone={activity.totals.still_pending ? "warn" : undefined} />
                    <StatTile label="Lost there" value={fmt(activity.totals.total_lost)} tone={activity.totals.total_lost ? "danger" : undefined} />
                    <StatTile label="Dead there" value={fmt(activity.totals.total_dead)} tone={activity.totals.total_dead ? "danger" : undefined} />
                  </div>
                  <TableWrap>
                    <table className="w-full text-sm">
                      <thead className="border-b border-line bg-surface-2/50">
                        <tr>
                          <th className={th}>Exhibition</th>
                          <th className={th}>Product</th>
                          <th className={`${th} text-right`}>Sent</th>
                          <th className={`${th} text-right`}>Returned</th>
                          <th className={`${th} text-right`}>Still out</th>
                          <th className={`${th} text-right`}>Lost</th>
                          <th className={`${th} text-right`}>Dead</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {activity.byExhibition.flatMap((ex) =>
                          ex.products.map((p, i) => (
                            <tr key={`${ex.exhibition_id}-${p.product_id}`}>
                              <td className={`${td} font-medium`}>{i === 0 ? (ex.exhibition_name ?? "Exhibition") : ""}</td>
                              <td className={td}>{p.product_name}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmt(p.total_sent)}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmt(p.total_returned)}</td>
                              <td className={`${td} text-right`}>
                                <Count n={p.still_pending} tone="warn" />
                              </td>
                              <td className={`${td} text-right`}>
                                <Count n={p.lost} tone="danger" />
                              </td>
                              <td className={`${td} text-right`}>
                                <Count n={p.dead} tone="danger" />
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </TableWrap>
                </>
              )}
            </Section>

            <Section
              title="Transfers"
              description={`${fmt(s.transfers.totals.total_transferred_in)} units in, ${fmt(s.transfers.totals.total_transferred_out)} units out.`}
            >
              {s.transfers.in.length + s.transfers.out.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">No transfers yet.</p>
              ) : (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Direction</th>
                        <th className={th}>Product</th>
                        <th className={`${th} text-right`}>Quantity</th>
                        <th className={th}>Other warehouse</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[
                        ...s.transfers.in.map((x) => ({ ...x, dir: "in" as const, other: x.from_warehouse })),
                        ...s.transfers.out.map((x) => ({ ...x, dir: "out" as const, other: x.to_warehouse })),
                      ]
                        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                        .map((x, i) => (
                          <tr key={i}>
                            <td className={`${td} text-muted`}>{fmtDate(x.date)}</td>
                            <td className={td}>
                              {x.dir === "in" ? (
                                <span className="inline-flex items-center gap-1 text-success">
                                  <ArrowDownLeft className="size-3.5" aria-hidden /> In
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-muted">
                                  <ArrowUpRight className="size-3.5" aria-hidden /> Out
                                </span>
                              )}
                            </td>
                            <td className={td}>{x.product_name ?? "Deleted product"}</td>
                            <td className={`${td} text-right tabular-nums`}>{fmt(x.quantity)}</td>
                            <td className={td}>{x.other ?? "Deleted warehouse"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Section>

            <ProductDialog open={adding} onClose={() => setAdding(false)} warehouseId={id} />
            <WarehouseDialog open={editing} onClose={() => setEditing(false)} warehouse={w} />
            <Modal open={transferring} onClose={() => setTransferring(false)} title={`Transfer from ${warehouseLabel(s.warehouse)}`}>
              {transferring && <TransferFromHere warehouseId={id} onClose={() => setTransferring(false)} />}
            </Modal>
          </>
        );
      }}
    </QueryState>
  );
}

function TransferFromHere({ warehouseId, onClose }: { warehouseId: string; onClose: () => void }) {
  // Reuse the full form with the source warehouse preset.
  return <TransferForm key={warehouseId} presetFrom={warehouseId} onCancel={onClose} />;
}
