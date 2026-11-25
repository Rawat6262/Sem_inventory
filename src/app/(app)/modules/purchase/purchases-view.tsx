"use client";

import { ChevronRight, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, QueryState, SearchBox, StatTile, TableWrap, fmtMoney, td, th } from "@/components/data-ui";
import { Button, cn } from "@/components/ui";
import { Paged } from "@/components/pagination";
import { useMe } from "@/hooks/use-me";
import { canRecordPurchases } from "@/lib/permissions";
import { usePurchases, type Purchase, type PurchaseStatus } from "@/lib/purchases";
import { fmt, fmtDate, warehouseLabel } from "@/lib/stock";
import { PurchaseDialog } from "./_components/purchase-dialog";
import { ReceiveButton } from "./_components/receive-button";

const TABS: { key: PurchaseStatus | "all"; label: string }[] = [
  { key: "pending", label: "Waiting to receive" },
  { key: "received", label: "Received" },
  { key: "all", label: "All" },
];

export function PurchasesView() {
  const me = useMe().data;
  const [tab, setTab] = useState<PurchaseStatus | "all">("pending");
  const all = usePurchases("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const canRecord = Boolean(me && canRecordPurchases(me.role));

  const list = all.data ?? [];
  const pending = list.filter((p) => p.status === "pending");
  const q = search.trim().toLowerCase();
  const shown = list
    .filter((p) => tab === "all" || p.status === tab)
    .filter(
      (p) =>
        !q ||
        p.purchase_number.toLowerCase().includes(q) ||
        p.vendor?.vendorName.toLowerCase().includes(q) ||
        p.purchased_by?.full_name.toLowerCase().includes(q) ||
        p.items.some((it) => it.name.toLowerCase().includes(q)),
    );

  return (
    <QueryState queries={[all]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="Waiting to receive" value={fmt(pending.length)} tone={pending.length > 0 ? "warn" : undefined} />
            <StatTile label="Value waiting" value={fmtMoney(pending.reduce((s, p) => s + p.total_amount, 0))} />
            <StatTile label="All purchases" value={fmt(list.length)} />
          </div>

          <div className="mt-8 mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Purchase status" className="inline-flex rounded-lg border border-line bg-surface p-0.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={cn("rounded-md px-3 py-1.5 text-sm font-medium", tab === t.key ? "bg-accent-soft text-accent" : "text-muted hover:text-ink")}
                >
                  {t.label}
                  {t.key === "pending" && pending.length > 0 && <span className="ml-1.5 tabular-nums">({pending.length})</span>}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search number, vendor, buyer or item" />
              {canRecord && (
                <Button onClick={() => setCreating(true)}>
                  <Plus className="size-4" aria-hidden />
                  Record purchase
                </Button>
              )}
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="size-6" />}
              title="No purchases yet"
              action={canRecord ? <Button onClick={() => setCreating(true)}>Record the first purchase</Button> : undefined}
            >
              {canRecord ? "Record what was bought; it goes into stock once someone receives it." : "Purchases recorded by admin or employee users show up here to receive into stock."}
            </EmptyState>
          ) : shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{q ? "No purchases match this search." : tab === "pending" ? "Nothing is waiting to be received." : "No purchases here."}</p>
          ) : (
            <Paged items={shown} resetKey={`${tab}|${search}`}>
              {(pageRows) => (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Purchase</th>
                        <th className={th}>Date</th>
                        <th className={th}>Vendor</th>
                        <th className={th}>Items</th>
                        <th className={th}>Warehouse</th>
                        <th className={th}>Bought by</th>
                        <th className={`${th} text-right`}>Total</th>
                        <th className={th}>Status</th>
                        <th className={th}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((p) => (
                        <PurchaseRow key={p._id} p={p} />
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Paged>
          )}

          <PurchaseDialog open={creating} onClose={() => setCreating(false)} />
        </>
      )}
    </QueryState>
  );
}

function PurchaseRow({ p }: { p: Purchase }) {
  const itemsLabel = p.items.length === 1 ? `${p.items[0].name} × ${fmt(p.items[0].quantity)}` : `${p.items[0]?.name} + ${p.items.length - 1} more`;
  return (
    <tr className="hover:bg-surface-2/40">
      <td className={td}>
        <Link href={`/modules/purchase/${p._id}`} className="font-medium hover:text-accent hover:underline">
          {p.purchase_number}
        </Link>
      </td>
      <td className={`${td} text-muted`}>{fmtDate(p.purchase_date)}</td>
      <td className={td}>{p.vendor?.vendorName ?? "—"}</td>
      <td className={`${td} max-w-56 truncate`} title={p.items.map((it) => `${it.name} × ${it.quantity}`).join(", ")}>
        {itemsLabel}
      </td>
      <td className={`${td} text-muted`}>{warehouseLabel(p.warehouse)}</td>
      <td className={`${td} text-muted`}>{p.purchased_by?.full_name ?? "—"}</td>
      <td className={`${td} text-right tabular-nums`}>{fmtMoney(p.total_amount)}</td>
      <td className={td}>
        <StatusBadge status={p.status} />
      </td>
      <td className={`${td} text-right`}>
        <div className="flex justify-end gap-1">
          <ReceiveButton purchase={p} compact />
          <Link
            href={`/modules/purchase/${p._id}`}
            className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
          >
            View
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </td>
    </tr>
  );
}

export function StatusBadge({ status }: { status: PurchaseStatus }) {
  return status === "received" ? (
    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Received</span>
  ) : (
    <span className="rounded-full bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn">Waiting to receive</span>
  );
}
