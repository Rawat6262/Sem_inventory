"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui";
import {
  available,
  categoryName,
  vendorName,
  warehouseLabel,
  type Category,
  type Product,
  type Warehouse,
} from "@/lib/stock";
import { ProductManageDialog } from "./product-manage";
import { Count, SearchBox, TableWrap, td, th } from "./stock-ui";

export type StatusFilter = "all" | "available" | "out" | "repair" | "lost" | "dead" | "empty";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Any status",
  available: "On the shelf",
  out: "Out for exhibition",
  repair: "In repair",
  lost: "Has lost items",
  dead: "Has dead items",
  empty: "Nothing on the shelf",
};

function matchesStatus(p: Product, s: StatusFilter) {
  switch (s) {
    case "available":
      return available(p) > 0;
    case "out":
      return p.out_for_exhibition > 0;
    case "repair":
      return p.repair_item > 0;
    case "lost":
      return p.lost > 0;
    case "dead":
      return p.dead > 0;
    case "empty":
      return available(p) <= 0;
    default:
      return true;
  }
}

type Props = {
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  /** Hide the warehouse column and filter (on a single warehouse's page). */
  singleWarehouse?: boolean;
};

// Searchable, filterable product list. "Manage" opens every action for a row.
export function ProductTable({ products, categories, warehouses, singleWarehouse }: Props) {
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [managing, setManaging] = useState<string | null>(null);

  const byId = useMemo(() => new Map(warehouses.map((w) => [w._id, w])), [warehouses]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (vendorName(p.vendor) ?? "").toLowerCase().includes(q))
      .filter((p) => !warehouse || (warehouse === "none" ? !p.warehouse || !byId.has(p.warehouse) : p.warehouse === warehouse))
      .filter((p) => !category || categoryName(p.category, categories) === category)
      .filter((p) => matchesStatus(p, status))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search, warehouse, category, status, categories, byId]);

  // Category names actually used, so the filter never offers an empty choice.
  const usedCategories = useMemo(() => [...new Set(products.map((p) => categoryName(p.category, categories)))].sort(), [products, categories]);
  const orphaned = products.some((p) => !p.warehouse || !byId.has(p.warehouse));

  // Look the product up fresh so the dialog never shows stale numbers.
  const managed = managing ? (products.find((p) => p._id === managing) ?? null) : null;

  return (
    <>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchBox value={search} onChange={setSearch} placeholder="Search products or vendors" />
        {!singleWarehouse && (
          <Select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} aria-label="Filter by warehouse" className="sm:w-56">
            <option value="">All warehouses</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {warehouseLabel(w)}
              </option>
            ))}
            {orphaned && <option value="none">No warehouse</option>}
          </Select>
        )}
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className="sm:w-48">
          <option value="">All categories</option>
          {usedCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Filter by status" className="sm:w-48">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      <TableWrap>
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2/50">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Category</th>
              {!singleWarehouse && <th className={th}>Warehouse</th>}
              <th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right`}>On shelf</th>
              <th className={`${th} text-right`}>Out</th>
              <th className={`${th} text-right`}>Repair</th>
              <th className={`${th} text-right`}>Lost</th>
              <th className={`${th} text-right`}>Dead</th>
              <th className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => {
              const w = p.warehouse ? byId.get(p.warehouse) : undefined;
              return (
                <tr key={p._id} className="hover:bg-surface-2/40">
                  <td className={td}>
                    <button type="button" onClick={() => setManaging(p._id)} className="text-left font-medium hover:text-accent">
                      {p.name}
                    </button>
                    <div className="text-xs text-muted">
                      {p.unit}
                      {vendorName(p.vendor) ? ` · ${vendorName(p.vendor)}` : ""}
                    </div>
                  </td>
                  <td className={`${td} text-muted`}>{categoryName(p.category, categories)}</td>
                  {!singleWarehouse && (
                    <td className={td}>
                      {w ? (
                        <Link href={`/modules/stock/warehouses/${w._id}`} className="hover:text-accent hover:underline">
                          {warehouseLabel(w)}
                        </Link>
                      ) : (
                        <span className="text-muted">No warehouse</span>
                      )}
                    </td>
                  )}
                  <td className={`${td} text-right tabular-nums`}>{new Intl.NumberFormat("en-IN").format(p.no_of_item)}</td>
                  <td className={`${td} text-right`}>
                    <Count n={available(p)} tone="accent" />
                  </td>
                  <td className={`${td} text-right`}>
                    <Count n={p.out_for_exhibition} />
                  </td>
                  <td className={`${td} text-right`}>
                    <Count n={p.repair_item} tone="warn" />
                  </td>
                  <td className={`${td} text-right`}>
                    <Count n={p.lost} tone="danger" />
                  </td>
                  <td className={`${td} text-right`}>
                    <Count n={p.dead} tone="danger" />
                  </td>
                  <td className={`${td} text-right`}>
                    <button
                      type="button"
                      onClick={() => setManaging(p._id)}
                      className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-accent hover:bg-accent-soft"
                    >
                      Manage
                      <ChevronRight className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted">
            {products.length === 0 ? "No products yet." : "No products match these filters."}
          </p>
        )}
      </TableWrap>
      <p className="mt-2 text-xs text-muted">
        Showing {rows.length} of {products.length} products. &ldquo;On shelf&rdquo; is what can be sent out or transferred now.
      </p>

      <ProductManageDialog product={managed} onClose={() => setManaging(null)} />
    </>
  );
}
