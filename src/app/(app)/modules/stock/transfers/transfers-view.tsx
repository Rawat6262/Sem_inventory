"use client";

import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui";
import { fmt, fmtDate, useTransfers, useWarehouses, warehouseLabel } from "@/lib/stock";
import { QueryState, SearchBox, Section, TableWrap, td, th } from "../_components/stock-ui";
import { TransferForm } from "../_components/transfer-form";

export function TransfersView() {
  const transfers = useTransfers();
  const warehouses = useWarehouses();
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (transfers.data ?? []).filter(
      (t) =>
        (!q || (t.product?.name ?? "").toLowerCase().includes(q) || (t.transferredBy?.full_name ?? "").toLowerCase().includes(q)) &&
        (!warehouse || t.fromWarehouse?._id === warehouse || t.toWarehouse?._id === warehouse),
    );
  }, [transfers.data, search, warehouse]);

  const tooFew = (warehouses.data?.length ?? 0) < 2;

  return (
    <QueryState queries={[transfers, warehouses]}>
      {() => (
        <>
          <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
            <h2 className="font-semibold">Move stock between warehouses</h2>
            <p className="mb-4 text-sm text-muted">Only units on the shelf can be moved. Items out, in repair, lost or dead stay where they are.</p>
            {tooFew ? (
              <p className="text-sm text-muted">You need at least two warehouses to transfer stock.</p>
            ) : (
              <TransferForm />
            )}
          </section>

          <Section title="History" description="Every transfer, newest first.">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search product or person" />
              <Select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} aria-label="Filter by warehouse" className="sm:w-56">
                <option value="">All warehouses</option>
                {warehouses.data?.map((w) => (
                  <option key={w._id} value={w._id}>
                    {warehouseLabel(w)}
                  </option>
                ))}
              </Select>
            </div>
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Product</th>
                    <th className={`${th} text-right`}>Quantity</th>
                    <th className={th}>From → To</th>
                    <th className={th}>By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((t) => (
                    <tr key={t._id}>
                      <td className={`${td} text-muted`}>{fmtDate(t.createdAt)}</td>
                      <td className={`${td} font-medium`}>{t.product?.name ?? <span className="font-normal text-muted">Deleted product</span>}</td>
                      <td className={`${td} text-right tabular-nums`}>
                        {fmt(t.quantity)} {t.product?.unit && <span className="text-muted">{t.product.unit}</span>}
                      </td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1.5">
                          {t.fromWarehouse ? warehouseLabel(t.fromWarehouse) : "Deleted"}
                          <ArrowRight className="size-3.5 text-muted" aria-hidden />
                          {t.toWarehouse ? warehouseLabel(t.toWarehouse) : "Deleted"}
                        </span>
                      </td>
                      <td className={`${td} text-muted`}>{t.transferredBy?.full_name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted">
                  {transfers.data?.length ? "No transfers match these filters." : "No transfers yet."}
                </p>
              )}
            </TableWrap>
          </Section>
        </>
      )}
    </QueryState>
  );
}
