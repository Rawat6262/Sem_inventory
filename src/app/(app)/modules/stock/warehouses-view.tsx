"use client";

import { MapPin, Pencil, Plus, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import { useMe } from "@/hooks/use-me";
import { canDeleteOwned, canEditStock } from "@/lib/permissions";
import {
  available,
  deleteWarehouse,
  fmt,
  useProducts,
  useStockMutation,
  useWarehouses,
  warehouseLabel,
  type Product,
  type Warehouse,
} from "@/lib/stock";
import { EmptyState, QueryState, SearchBox, StatTile } from "./_components/stock-ui";
import { WarehouseDialog } from "./_components/warehouse-dialog";

type Totals = { products: number; owned: number; shelf: number; out: number; repair: number; lostDead: number };

function totalsOf(products: Product[]): Totals {
  return products.reduce<Totals>(
    (t, p) => ({
      products: t.products + 1,
      owned: t.owned + p.no_of_item,
      shelf: t.shelf + Math.max(0, available(p)),
      out: t.out + p.out_for_exhibition,
      repair: t.repair + p.repair_item,
      lostDead: t.lostDead + p.lost + p.dead,
    }),
    { products: 0, owned: 0, shelf: 0, out: 0, repair: 0, lostDead: 0 },
  );
}

export function WarehousesView() {
  const warehouses = useWarehouses();
  const products = useProducts();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Warehouse | null | "new">(null);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);
  const remove = useStockMutation((id: string) => deleteWarehouse(id));
  const me = useMe().data;

  const perWarehouse = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products.data ?? []) {
      if (!p.warehouse) continue;
      map.set(p.warehouse, [...(map.get(p.warehouse) ?? []), p]);
    }
    return map;
  }, [products.data]);

  const overall = useMemo(() => totalsOf(products.data ?? []), [products.data]);
  const nextNo = Math.max(0, ...(warehouses.data ?? []).map((w) => w.warehouseNo ?? 0)) + 1;

  const q = search.trim().toLowerCase();
  const list = (warehouses.data ?? []).filter(
    (w) => !q || [w.name, w.city, w.state, w.address, String(w.warehouseNo ?? "")].some((v) => v?.toLowerCase().includes(q)),
  );

  return (
    <QueryState queries={[warehouses, products]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Warehouses" value={fmt(warehouses.data?.length)} />
            <StatTile label="Products" value={fmt(overall.products)} />
            <StatTile label="On the shelf" value={fmt(overall.shelf)} tone="accent" hint="units ready to use" />
            <StatTile label="Out for exhibition" value={fmt(overall.out)} />
            <StatTile label="In repair" value={fmt(overall.repair)} tone={overall.repair ? "warn" : undefined} />
            <StatTile label="Lost or dead" value={fmt(overall.lostDead)} tone={overall.lostDead ? "danger" : undefined} />
          </div>

          <div className="mt-8 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox value={search} onChange={setSearch} placeholder="Search warehouses" />
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Add warehouse
            </Button>
          </div>

          {warehouses.data?.length === 0 ? (
            <EmptyState
              icon={<WarehouseIcon className="size-6" />}
              title="No warehouses yet"
              action={<Button onClick={() => setEditing("new")}>Add the first warehouse</Button>}
            >
              Add a warehouse, then add products to it.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No warehouses match &ldquo;{search}&rdquo;.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((w) => {
                const t = totalsOf(perWarehouse.get(w._id) ?? []);
                return (
                  <li key={w._id} className="flex flex-col rounded-xl border border-line bg-surface">
                    <Link href={`/modules/stock/warehouses/${w._id}`} className="group flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-medium group-hover:text-accent">{warehouseLabel(w)}</h2>
                      </div>
                      <p className="mt-1 flex items-start gap-1 text-sm text-muted">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <span className="line-clamp-2">
                          {[w.address, w.city, w.state].filter(Boolean).join(", ")}
                        </span>
                      </p>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-surface-2/60 py-2">
                          <dt className="text-xs text-muted">Products</dt>
                          <dd className="font-semibold tabular-nums">{fmt(t.products)}</dd>
                        </div>
                        <div className="rounded-lg bg-surface-2/60 py-2">
                          <dt className="text-xs text-muted">On shelf</dt>
                          <dd className="font-semibold tabular-nums text-accent">{fmt(t.shelf)}</dd>
                        </div>
                        <div className="rounded-lg bg-surface-2/60 py-2">
                          <dt className="text-xs text-muted">Out</dt>
                          <dd className="font-semibold tabular-nums">{fmt(t.out)}</dd>
                        </div>
                      </dl>
                      {(t.repair > 0 || t.lostDead > 0) && (
                        <p className="mt-2 text-xs">
                          {t.repair > 0 && <span className="text-warn">{fmt(t.repair)} in repair</span>}
                          {t.repair > 0 && t.lostDead > 0 && <span className="text-muted"> · </span>}
                          {t.lostDead > 0 && <span className="text-danger">{fmt(t.lostDead)} lost or dead</span>}
                        </p>
                      )}
                    </Link>
                    <div className="flex justify-end gap-1 border-t border-line px-2 py-1.5">
                      {me && canEditStock(me, w.createdBy) && (
                        <Button variant="ghost" className="h-8 px-2.5" onClick={() => setEditing(w)}>
                          <Pencil className="size-3.5" aria-hidden />
                          Edit
                        </Button>
                      )}
                      {me && canDeleteOwned(me, w.createdBy) && (
                        <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(w)}>
                          <Trash2 className="size-3.5" aria-hidden />
                          Delete
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <WarehouseDialog
            open={editing !== null}
            warehouse={editing === "new" ? null : editing}
            nextNo={nextNo}
            onClose={() => setEditing(null)}
          />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${warehouseLabel(deleting)}?`}
            confirmLabel="Delete warehouse"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            {(() => {
              const count = deleting ? (perWarehouse.get(deleting._id)?.length ?? 0) : 0;
              return count > 0 ? (
                <>
                  This warehouse still has <strong className="text-ink">{fmt(count)} products</strong>. They won&apos;t be deleted, but they&apos;ll no
                  longer belong to any warehouse. Transfer them first if you want to keep them organised. This can&apos;t be undone.
                </>
              ) : (
                <>The warehouse has no products. This can&apos;t be undone.</>
              );
            })()}
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
