"use client";

import { Landmark, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { Count, EmptyState, QueryState, SearchBox, TableWrap, td, th } from "@/components/data-ui";
import { fmtMoney, useFinanceVendors } from "@/lib/finance-vendors";
import { TaxableEntryDialog } from "./_components/taxable-entry-dialog";

export function FinanceVendorsView() {
  const ledgers = useFinanceVendors();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const q = search.trim().toLowerCase();
  const list = (ledgers.data ?? []).filter((l) => !q || l.vendor?.vendorName.toLowerCase().includes(q));
  const alreadyLedgered = (ledgers.data ?? []).map((l) => l.vendor?._id).filter(Boolean) as string[];

  return (
    <QueryState queries={[ledgers]}>
      {() => (
        <>
          <p className="mb-4 text-sm text-muted">
            A GST ledger per vendor: what&apos;s taxable, GST payable, and what&apos;s been paid. This is separate from the payments tracked on the
            plain Vendors module.
          </p>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by vendor name" />
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden />
              Add taxable entry
            </Button>
          </div>

          {ledgers.data?.length === 0 ? (
            <EmptyState icon={<Landmark className="size-6" />} title="No GST ledgers yet" action={<Button onClick={() => setAdding(true)}>Add the first entry</Button>}>
              Pick a vendor and add their first taxable amount to start a ledger for them.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No vendors match &ldquo;{search}&rdquo;.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Vendor</th>
                    <th className={`${th} text-right`}>Taxable amount</th>
                    <th className={`${th} text-right`}>GST payable</th>
                    <th className={`${th} text-right`}>Paid</th>
                    <th className={`${th} text-right`}>Remaining</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((l) => (
                    <tr key={l._id} className="hover:bg-surface-2/40">
                      <td className={td}>
                        <Link href={`/modules/finance-vendor/${l.vendor?._id}`} className="font-medium hover:text-accent hover:underline">
                          {l.vendor?.vendorName ?? "Deleted vendor"}
                        </Link>
                        <div className="text-xs text-muted">
                          {fmt(l.totalTaxableEntries)} entries · {fmt(l.totalPayments)} payments
                        </div>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{fmtMoney(l.taxableAmount)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtMoney(l.gstBalance)}</td>
                      <td className={`${td} text-right`}>
                        <Count n={l.paidAmount} tone="success" money />
                      </td>
                      <td className={`${td} text-right`}>
                        <Count n={l.remainingBalance} tone="warn" money />
                      </td>
                      <td className={`${td} text-right`}>
                        <Link
                          href={`/modules/finance-vendor/${l.vendor?._id}`}
                          className="inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}

          <TaxableEntryDialog open={adding} onClose={() => setAdding(false)} excludeVendorIds={alreadyLedgered} />
        </>
      )}
    </QueryState>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}
