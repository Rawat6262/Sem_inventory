"use client";

import { useMe } from "@/hooks/use-me";
import { mayDelete } from "@/lib/permissions";
import { ArrowLeftRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Paged } from "@/components/pagination";
import { Button, Select } from "@/components/ui";
import { EmptyState, QueryState, SearchBox, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { useExhibitionsList } from "@/lib/contractors";
import {
  CATEGORY_LABELS,
  deleteTransaction,
  entityName,
  fmtDate,
  fmtMoney,
  TRANSACTION_CATEGORIES,
  useTransactions,
  useTransactionsMutation,
  type Transaction,
  type TransactionCategory,
} from "@/lib/transactions";
import { TransactionDialog } from "./_components/transaction-dialog";

export function TransactionsView() {
  const transactions = useTransactions();
  const exhibitions = useExhibitionsList();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TransactionCategory | "">("");
  const [exhibitionId, setExhibitionId] = useState("");

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const remove = useTransactionsMutation((id: string) => deleteTransaction(id));
  const me = useMe().data;

  const total = useMemo(() => (transactions.data ?? []).reduce((sum, t) => sum + t.total_amount, 0), [transactions.data]);

  const q = search.trim().toLowerCase();
  const list = useMemo(
    () =>
      (transactions.data ?? [])
        .filter((t) => !category || t.category === category)
        .filter((t) => !exhibitionId || t.exhibition?._id === exhibitionId)
        .filter((t) => !q || entityName(t).toLowerCase().includes(q) || t.remark?.toLowerCase().includes(q))
        .sort((a, b) => +new Date(b.transaction_date) - +new Date(a.transaction_date)),
    [transactions.data, category, exhibitionId, q],
  );

  return (
    <QueryState queries={[transactions]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Transactions" value={transactions.data?.length ?? 0} />
            <StatTile label="Total paid" value={fmtMoney(total)} tone="success" />
          </div>

          <div className="mt-6 mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search by name or remark" />
              <Select value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory | "")} aria-label="Filter by category" className="sm:w-40">
                <option value="">All categories</option>
                {TRANSACTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
              <Select value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} aria-label="Filter by exhibition" className="sm:w-48">
                <option value="">All exhibitions</option>
                {exhibitions.data?.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Add transaction
            </Button>
          </div>

          {transactions.data?.length === 0 ? (
            <EmptyState icon={<ArrowLeftRight className="size-6" />} title="No transactions yet" action={<Button onClick={() => setCreating(true)}>Add the first transaction</Button>}>
              Record money paid to a contractor, supervisor, vendor or transporter.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No transactions match these filters.</p>
          ) : (
            <Paged items={list} resetKey={`${search}|${category}|${exhibitionId}`}>
              {(pageRows) => (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Date</th>
                        <th className={th}>Category</th>
                        <th className={th}>Paid to</th>
                        <th className={th}>Exhibition</th>
                        <th className={th}>Remark</th>
                        <th className={`${th} text-right`}>Amount paid</th>
                        <th className={th}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((t) => (
                        <tr key={t._id} className="hover:bg-surface-2/40">
                          <td className={`${td} text-muted`}>{fmtDate(t.transaction_date)}</td>
                          <td className={`${td} text-muted`}>{CATEGORY_LABELS[t.category]}</td>
                          <td className={`${td} font-medium`}>{entityName(t)}</td>
                          <td className={`${td} text-muted`}>{t.exhibition_name ?? t.exhibition?.name ?? "—"}</td>
                          <td className={`${td} max-w-48 truncate text-muted`} title={t.remark}>
                            {t.remark}
                          </td>
                          <td className={`${td} text-right tabular-nums`}>{fmtMoney(t.total_amount)}</td>
                          <td className={`${td} text-right`}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" className="h-8 px-2" onClick={() => setEditing(t)} aria-label="Edit">
                                <Pencil className="size-3.5" aria-hidden />
                              </Button>
                              {me && mayDelete(me, t.createdBy) && (
                                <Button variant="ghost" className="h-8 px-2 hover:text-danger" onClick={() => setDeleting(t)} aria-label="Delete">
                                  <Trash2 className="size-3.5" aria-hidden />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </Paged>
          )}
          <p className="mt-2 text-xs text-muted">
            Showing {list.length} of {transactions.data?.length ?? 0} transactions.
          </p>

          <TransactionDialog open={creating} onClose={() => setCreating(false)} />
          {editing && <TransactionDialog open onClose={() => setEditing(null)} transaction={editing} />}

          <ConfirmDialog
            open={Boolean(deleting)}
            title="Delete this transaction?"
            confirmLabel="Delete"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            {deleting && (
              <>
                The {fmtMoney(deleting.total_amount)} payment to <strong className="text-ink">{entityName(deleting)}</strong> will be taken out of all totals and
                reports. This can&apos;t be undone.
              </>
            )}
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
