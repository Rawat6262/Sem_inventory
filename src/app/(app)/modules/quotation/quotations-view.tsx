"use client";

import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Paged } from "@/components/pagination";
import { Button } from "@/components/ui";
import { EmptyState, QueryState, SearchBox, TableWrap, td, th } from "@/components/data-ui";
import { useMe } from "@/hooks/use-me";
import { mayDelete } from "@/lib/permissions";
import {
  deleteQuotation,
  fmt,
  fmtDate,
  fmtMoney,
  useQuotations,
  useQuotationsMutation,
  useSearchQuotations,
  type Quotation,
} from "@/lib/quotations";
import { QuotationDialog } from "./_components/quotation-dialog";

export function QuotationsView() {
  const quotations = useQuotations();
  const search = useSearchQuotations();
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Quotation | null>(null);
  const remove = useQuotationsMutation((id: string) => deleteQuotation(id));
  const me = useMe().data;

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (keyword.trim()) search.mutate(keyword.trim());
    else search.reset();
  }

  const list = search.data ? search.data.data : (quotations.data ?? []);

  return (
    <QueryState queries={[quotations]}>
      {() => (
        <>
          <form onSubmit={runSearch} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <SearchBox
                value={keyword}
                onChange={(v) => {
                  setKeyword(v);
                  if (!v.trim()) search.reset();
                }}
                placeholder="Search by title, company or exhibition"
              />
              <Button type="submit" variant="secondary" loading={search.isPending} disabled={!keyword.trim()}>
                Search
              </Button>
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Add quotation
            </Button>
          </form>

          {quotations.data?.length === 0 ? (
            <EmptyState icon={<FileText className="size-6" />} title="No quotations yet" action={<Button onClick={() => setCreating(true)}>Add the first quotation</Button>}>
              Create a quotation, then add line items to it.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No quotations match &ldquo;{keyword}&rdquo;.</p>
          ) : (
            <Paged items={list} resetKey={String(search.data ? search.submittedAt : 0)}>
              {(pageRows) => (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Title</th>
                        <th className={th}>Company</th>
                        <th className={th}>Exhibition</th>
                        <th className={th}>Date</th>
                        <th className={`${th} text-right`}>Items</th>
                        <th className={`${th} text-right`}>Total</th>
                        <th className={th}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {pageRows.map((q) => (
                        <tr key={q._id} className="hover:bg-surface-2/40">
                          <td className={td}>
                            <Link href={`/modules/quotation/${q._id}`} className="font-medium hover:text-accent hover:underline">
                              {q.title}
                            </Link>
                          </td>
                          <td className={`${td} text-muted`}>{q.company_name}</td>
                          <td className={td}>{q.exhibition_name}</td>
                          <td className={`${td} text-muted`}>{fmtDate(q.date)}</td>
                          <td className={`${td} text-right tabular-nums`}>{fmt(q.items.length)}</td>
                          <td className={`${td} text-right tabular-nums font-medium`}>{fmtMoney(q.total)}</td>
                          <td className={`${td} text-right`}>
                            <div className="flex justify-end gap-1">
                              <Link
                                href={`/modules/quotation/${q._id}`}
                                className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                              >
                                View
                                <ChevronRight className="size-3.5" aria-hidden />
                              </Link>
                              {me && mayDelete(me, q.createdBy) && (
                                <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(q)} aria-label={`Delete ${q.title}`}>
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

          <QuotationDialog open={creating} onClose={() => setCreating(false)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.title ?? ""}?`}
            confirmLabel="Delete quotation"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            This can&apos;t be undone.
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
