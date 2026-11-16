"use client";

import { TriangleAlert } from "lucide-react";
import { fmt, useStockOverview } from "@/lib/reports";
import { EmptyNote, QueryState, Section, StatTile, TableWrap, td, th } from "../_components/reports-ui";

export function StockOverviewView() {
  const overview = useStockOverview();

  return (
    <QueryState queries={[overview]}>
      {() => {
        const d = overview.data!;
        return (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Warehouses" value={d.warehouses.length} />
              <StatTile label="Products" value={fmt(d.totals.product_count)} />
              <StatTile label="Total stock" value={fmt(d.totals.total_no)} />
              <StatTile label="On the shelf" value={fmt(d.totals.no_of_item)} tone="success" />
              <StatTile label="Out for exhibition" value={fmt(d.totals.out_for_exhibition)} tone="accent" />
              <StatTile label="Lost / dead" value={`${fmt(d.totals.lost)} / ${fmt(d.totals.dead)}`} tone="danger" />
            </div>

            <Section title="By warehouse">
              {d.warehouses.length === 0 ? (
                <EmptyNote>No warehouses yet.</EmptyNote>
              ) : (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Warehouse</th>
                        <th className={`${th} text-right`}>Products</th>
                        <th className={`${th} text-right`}>Total</th>
                        <th className={`${th} text-right`}>On shelf</th>
                        <th className={`${th} text-right`}>Out</th>
                        <th className={`${th} text-right`}>Repair</th>
                        <th className={`${th} text-right`}>Lost</th>
                        <th className={`${th} text-right`}>Dead</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {d.warehouses.map((w) => (
                        <tr key={w.warehouse_id}>
                          <td className={td}>
                            {w.warehouse_name} (#{w.warehouse_no})
                          </td>
                          <td className={`${td} text-right`}>{w.product_count}</td>
                          <td className={`${td} text-right`}>{fmt(w.total_no)}</td>
                          <td className={`${td} text-right text-success`}>{fmt(w.no_of_item)}</td>
                          <td className={`${td} text-right text-accent`}>{fmt(w.out_for_exhibition)}</td>
                          <td className={`${td} text-right text-muted`}>{fmt(w.repair_item)}</td>
                          <td className={`${td} text-right text-danger`}>{fmt(w.lost)}</td>
                          <td className={`${td} text-right text-danger`}>{fmt(w.dead)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Section>

            <Section
              title="Low stock"
              description={`Products with ${d.low_stock_threshold} or fewer units on the shelf.`}
            >
              {d.low_stock.length === 0 ? (
                <EmptyNote>Nothing is running low.</EmptyNote>
              ) : (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Product</th>
                        <th className={th}>Warehouse</th>
                        <th className={`${th} text-right`}>On shelf</th>
                        <th className={`${th} text-right`}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {d.low_stock.map((p) => (
                        <tr key={p.product_id}>
                          <td className={td}>
                            <span className="inline-flex items-center gap-1.5">
                              <TriangleAlert className="size-3.5 text-warn" aria-hidden />
                              {p.product_name}
                            </span>
                          </td>
                          <td className={`${td} text-muted`}>{p.warehouse_name}</td>
                          <td className={`${td} text-right font-medium text-warn`}>{fmt(p.no_of_item)}</td>
                          <td className={`${td} text-right text-muted`}>{fmt(p.total_no)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Section>
          </>
        );
      }}
    </QueryState>
  );
}
