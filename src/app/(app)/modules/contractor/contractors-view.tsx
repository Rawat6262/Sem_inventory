"use client";

import { ChevronRight, HardHat, Phone, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button, Select } from "@/components/ui";
import { Count, EmptyState, QueryState, SearchBox, TableWrap, td, th } from "@/components/data-ui";
import { contractorTotals, deleteContractor, fmt, fmtMoney, useContractors, useContractorsMutation, type Contractor } from "@/lib/contractors";
import { ContractorDialog } from "./_components/contractor-dialog";

export function ContractorsView() {
  const contractors = useContractors();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [editing, setEditing] = useState<Contractor | null | "new">(null);
  const [deleting, setDeleting] = useState<Contractor | null>(null);
  const remove = useContractorsMutation((id: string) => deleteContractor(id));

  const types = useMemo(() => [...new Set((contractors.data ?? []).map((c) => c.labour_type))].sort(), [contractors.data]);

  const overall = useMemo(() => {
    const list = contractors.data ?? [];
    return list.reduce(
      (acc, c) => {
        const t = contractorTotals(c);
        return { agreement: acc.agreement + t.agreement, paid: acc.paid + t.paid, remaining: acc.remaining + t.remaining };
      },
      { agreement: 0, paid: 0, remaining: 0 },
    );
  }, [contractors.data]);

  const q = search.trim().toLowerCase();
  const list = (contractors.data ?? []).filter(
    (c) =>
      (!q || c.name.toLowerCase().includes(q) || String(c.phone_number).includes(q) || c.address?.toLowerCase().includes(q)) &&
      (!typeFilter || c.labour_type === typeFilter),
  );

  return (
    <QueryState queries={[contractors]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs font-medium text-muted">Contractors</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{fmt(contractors.data?.length)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs font-medium text-muted">Total agreed</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{fmtMoney(overall.agreement)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs font-medium text-muted">Paid</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-success">{fmtMoney(overall.paid)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-xs font-medium text-muted">Remaining</p>
              <p className={`mt-1 text-xl font-semibold tabular-nums ${overall.remaining > 0 ? "text-warn" : ""}`}>{fmtMoney(overall.remaining)}</p>
            </div>
          </div>

          <div className="mt-8 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search by name, phone or address" />
              {types.length > 0 && (
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by labour type" className="sm:w-48">
                  <option value="">All types</option>
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Add contractor
            </Button>
          </div>

          {contractors.data?.length === 0 ? (
            <EmptyState icon={<HardHat className="size-6" />} title="No contractors yet" action={<Button onClick={() => setEditing("new")}>Add the first contractor</Button>}>
              Add a labour contractor, then book them for an exhibition.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No contractors match these filters.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Type</th>
                    <th className={th}>Phone</th>
                    <th className={`${th} text-right`}>Stalls</th>
                    <th className={`${th} text-right`}>Agreed</th>
                    <th className={`${th} text-right`}>Paid</th>
                    <th className={`${th} text-right`}>Remaining</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((c) => {
                    const t = contractorTotals(c);
                    return (
                      <tr key={c._id} className="hover:bg-surface-2/40">
                        <td className={td}>
                          <Link href={`/modules/contractor/${c._id}`} className="font-medium hover:text-accent hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className={`${td} text-muted`}>{c.labour_type}</td>
                        <td className={td}>
                          <span className="inline-flex items-center gap-1 text-muted">
                            <Phone className="size-3.5" aria-hidden />
                            {c.phone_number}
                          </span>
                        </td>
                        <td className={`${td} text-right tabular-nums`}>{fmt(t.stalls)}</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtMoney(t.agreement)}</td>
                        <td className={`${td} text-right`}>
                          <Count n={t.paid} tone="success" money />
                        </td>
                        <td className={`${td} text-right`}>
                          <Count n={t.remaining} tone="warn" money />
                        </td>
                        <td className={`${td} text-right`}>
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/modules/contractor/${c._id}`}
                              className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                            >
                              View
                              <ChevronRight className="size-3.5" aria-hidden />
                            </Link>
                            <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}>
                              <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}

          <ContractorDialog open={editing !== null} contractor={editing === "new" ? null : editing} onClose={() => setEditing(null)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.name ?? ""}?`}
            confirmLabel="Delete contractor"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            {(() => {
              const t = deleting ? contractorTotals(deleting) : null;
              return t && t.stalls > 0 ? (
                <>
                  This contractor has <strong className="text-ink">{fmt(t.stalls)} stalls</strong> across exhibitions, with {fmtMoney(t.remaining)}{" "}
                  still owed. This can&apos;t be undone.
                </>
              ) : (
                <>This can&apos;t be undone.</>
              );
            })()}
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
