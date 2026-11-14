"use client";

import { FileText, Pencil, Plus, Printer, SearchX, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import { BackLink, EmptyState, QueryState } from "@/components/data-ui";
import { ApiError } from "@/lib/api";
import {
  deleteQuotation,
  fmtDate,
  fmtMoney,
  removeQuotationItem,
  useQuotation,
  useQuotationsMutation,
  type Quotation,
  type QuotationItem,
} from "@/lib/quotations";
import { HeaderDialog } from "../_components/header-dialog";
import { ItemDialog } from "../_components/item-dialog";

export function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const quotation = useQuotation(id);

  const [editingHeader, setEditingHeader] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [itemDialog, setItemDialog] = useState<{ item: QuotationItem | null } | null>(null);
  const [removingItem, setRemovingItem] = useState<QuotationItem | null>(null);

  const remove = useQuotationsMutation((qid: string) => deleteQuotation(qid));
  const removeItem = useQuotationsMutation(removeQuotationItem);

  if (quotation.error instanceof ApiError && [400, 404].includes(quotation.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Quotation not found" action={<BackLink href="/modules/quotation">Back to quotations</BackLink>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  return (
    <QueryState queries={[quotation]}>
      {() => {
        const q = quotation.data!;

        return (
          <>
            {/* On-screen, interactive view — hidden when printing. */}
            <div className="print:hidden">
              <BackLink href="/modules/quotation">← All quotations</BackLink>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{q.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {q.company_name} · {q.exhibition_name} · {q.exhibition_date}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setEditingHeader(true)}>
                    <Pencil className="size-4" aria-hidden />
                    Edit details
                  </Button>
                  <Button variant="secondary" className="hover:text-danger" onClick={() => setDeleting(true)}>
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                  <Button onClick={() => window.print()}>
                    <Printer className="size-4" aria-hidden />
                    Print / Export PDF
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="font-semibold">Items</h3>
                <Button variant="secondary" onClick={() => setItemDialog({ item: null })}>
                  <Plus className="size-4" aria-hidden />
                  Add item
                </Button>
              </div>

              {q.items.length === 0 ? (
                <div className="mt-3">
                  <EmptyState icon={<FileText className="size-6" />} title="No items yet" action={<Button onClick={() => setItemDialog({ item: null })}>Add the first item</Button>}>
                    Add what this quotation covers, with a cost for each.
                  </EmptyState>
                </div>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {q.items.map((item) => (
                    <li key={item._id} className="rounded-xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">
                            {item.title}
                            {item.size && <span className="font-normal text-muted"> — {item.size}</span>}
                          </div>
                          {item.description.length > 0 && (
                            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-muted">
                              {item.description.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex shrink-0 items-start gap-1">
                          <span className="pt-1.5 font-medium tabular-nums">{fmtMoney(item.cost)}</span>
                          <Button variant="ghost" className="h-8 px-2" onClick={() => setItemDialog({ item })} aria-label="Edit item">
                            <Pencil className="size-3.5" aria-hidden />
                          </Button>
                          <Button variant="ghost" className="h-8 px-2 hover:text-danger" onClick={() => setRemovingItem(item)} aria-label="Remove item">
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <Totals quotation={q} />
            </div>

            {/* Print-only clean document — hidden on screen. */}
            <PrintableQuotation quotation={q} />

            <HeaderDialog open={editingHeader} onClose={() => setEditingHeader(false)} quotation={q} />
            <ConfirmDialog
              open={deleting}
              title={`Delete ${q.title}?`}
              confirmLabel="Delete quotation"
              pending={remove.isPending}
              error={remove.error?.message}
              onClose={() => {
                setDeleting(false);
                remove.reset();
              }}
              onConfirm={() => remove.mutate(q._id, { onSuccess: () => router.push("/modules/quotation") })}
            >
              This can&apos;t be undone.
            </ConfirmDialog>
            {itemDialog && <ItemDialog open onClose={() => setItemDialog(null)} quotationId={q._id} item={itemDialog.item} />}
            <ConfirmDialog
              open={Boolean(removingItem)}
              title={`Remove ${removingItem?.title ?? ""}?`}
              confirmLabel="Remove"
              pending={removeItem.isPending}
              error={removeItem.error?.message}
              onClose={() => {
                setRemovingItem(null);
                removeItem.reset();
              }}
              onConfirm={() => removingItem && removeItem.mutate({ id: q._id, itemId: removingItem._id }, { onSuccess: () => setRemovingItem(null) })}
            >
              This can&apos;t be undone.
            </ConfirmDialog>
          </>
        );
      }}
    </QueryState>
  );
}

function Totals({ quotation: q }: { quotation: Quotation }) {
  return (
    <div className="mt-4 ml-auto flex max-w-xs flex-col gap-1 rounded-xl border border-line bg-surface p-4 text-sm">
      <div className="flex justify-between text-muted">
        <span>Subtotal</span>
        <span className="tabular-nums">{fmtMoney(q.subtotal)}</span>
      </div>
      <div className="flex justify-between text-muted">
        <span>GST ({q.gst_percent}%)</span>
        <span className="tabular-nums">{fmtMoney(q.gst_amount)}</span>
      </div>
      <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{fmtMoney(q.total)}</span>
      </div>
    </div>
  );
}

// A plain, print-friendly rendering of the quotation. Visible only in print
// (`hidden print:block`) so a saved PDF doesn't include the app's own chrome
// or the editing controls.
function PrintableQuotation({ quotation: q }: { quotation: Quotation }) {
  return (
    <div className="hidden print:block">
      <div className="flex items-start justify-between border-b-2 border-ink pb-3">
        <div>
          <h1 className="text-2xl font-bold">{q.company_name}</h1>
          <p className="text-sm">Quotation: {q.title}</p>
        </div>
        <div className="text-right text-sm">
          <p>Date: {fmtDate(q.date)}</p>
          {q.gst_no && <p>GSTIN: {q.gst_no}</p>}
        </div>
      </div>

      <div className="mt-4 text-sm">
        <p>
          <span className="font-medium">Exhibition:</span> {q.exhibition_name}
        </p>
        <p>
          <span className="font-medium">Date:</span> {q.exhibition_date}
        </p>
        {q.venue && (
          <p>
            <span className="font-medium">Venue:</span> {q.venue}
          </p>
        )}
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="py-2 pr-2">Item</th>
            <th className="py-2 pr-2 text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {q.items.map((item) => (
            <tr key={item._id} className="border-b border-line align-top">
              <td className="py-2 pr-2">
                <div className="font-medium">
                  {item.title}
                  {item.size && <span className="font-normal"> — {item.size}</span>}
                </div>
                {item.description.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {item.description.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums whitespace-nowrap">{fmtMoney(item.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto flex max-w-xs flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">{fmtMoney(q.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>GST ({q.gst_percent}%)</span>
          <span className="tabular-nums">{fmtMoney(q.gst_amount)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t-2 border-ink pt-1 text-base font-bold">
          <span>Total</span>
          <span className="tabular-nums">{fmtMoney(q.total)}</span>
        </div>
      </div>
    </div>
  );
}
