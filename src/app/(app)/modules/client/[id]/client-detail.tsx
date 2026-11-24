"use client";

import { CalendarDays, ChartColumn, Pencil, Phone, Plus, RotateCcw, SearchX, Star, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Alert, Button } from "@/components/ui";
import { BackLink, Count, EmptyNote, EmptyState, QueryState, Section, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";
import { canOpen, mayDelete } from "@/lib/permissions";
import {
  clientTotals,
  deleteClient,
  deleteDesign,
  designOf,
  exhibitionRefId,
  exhibitionRefName,
  fmt,
  fmtDate,
  fmtMoney,
  makeDesignFinal,
  rejectedByName,
  reopenClient,
  removeClientStall,
  removeExhibitionFromClient,
  clientStatus,
  stallStatus,
  useClient,
  useClientsMutation,
  type ClientExhibitionEntry,
  type ClientStall,
  type Design,
} from "@/lib/clients";
import { AddExhibitionDialog } from "../_components/add-exhibition-dialog";
import { ClientDialog } from "../_components/client-dialog";
import { DealStatusBadge } from "../_components/deal-status-badge";
import { DesignDialog } from "../_components/design-dialog";
import { StallDialog } from "../_components/stall-dialog";
import { StallPaymentDialog } from "../_components/stall-payment-dialog";

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useClient(id);
  const me = useMe().data;
  const canSeeReports = Boolean(me && canOpen(me.role, "reports"));

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingExhibition, setAddingExhibition] = useState(false);
  const [removingExhibition, setRemovingExhibition] = useState<ClientExhibitionEntry | null>(null);
  const [stallDialog, setStallDialog] = useState<{ exhibitionId: string; stall: ClientStall | null } | null>(null);
  const [removingStall, setRemovingStall] = useState<{ exhibitionId: string; stall: ClientStall } | null>(null);
  const [payingStall, setPayingStall] = useState<{ exhibitionId: string; stall: ClientStall } | null>(null);
  const [designDialog, setDesignDialog] = useState<{ exhibitionId: string; nextOptionNo: number; design: Design | null } | null>(null);
  const [removingDesign, setRemovingDesign] = useState<Design | null>(null);

  const remove = useClientsMutation((cid: string) => deleteClient(cid));
  const removeExhibition = useClientsMutation(removeExhibitionFromClient);
  const removeStallMut = useClientsMutation(removeClientStall);
  const removeDesignMut = useClientsMutation((did: string) => deleteDesign(did));
  const makeFinalMut = useClientsMutation((did: string) => makeDesignFinal(did));
  const reopenMut = useClientsMutation((cid: string) => reopenClient(cid));

  if (client.error instanceof ApiError && [400, 404].includes(client.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Client not found" action={<BackLink href="/modules/client">Back to clients</BackLink>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  if (client.error instanceof ApiError && client.error.status === 403) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Not your client" action={<BackLink href="/modules/client">Back to clients</BackLink>}>
        You can only open clients you added. Ask the person who added this client to share it with you.
      </EmptyState>
    );
  }

  return (
    <QueryState queries={[client]}>
      {() => {
        const c = client.data!;
        const totals = clientTotals(c);
        // Removing the client, its bookings or its stalls needs ownership of the client.
        const canRemove = Boolean(me && mayDelete(me, c.createdBy));

        return (
          <>
            <BackLink href="/modules/client">← All clients</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
                  {c.companyName || c.clientName}
                  <DealStatusBadge status={clientStatus(c)} />
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  {c.companyName && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium">{c.clientName}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {c.phoneNumber}
                  </span>
                  {c.address && <span>{c.address}</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                {canRemove && (
                  <Button variant="secondary" className="hover:text-danger" onClick={() => setDeleting(true)}>
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                )}
                {canSeeReports && (
                  <Link href={`/modules/reports/clients/${c._id}`}>
                    <Button variant="secondary">
                      <ChartColumn className="size-4" aria-hidden />
                      Payment report
                    </Button>
                  </Link>
                )}
                {!c.rejected && (
                  <Button onClick={() => setAddingExhibition(true)}>
                    <Plus className="size-4" aria-hidden />
                    Book for exhibition
                  </Button>
                )}
              </div>
            </div>

            {c.rejected && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-soft/40 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-sm">
                  <p className="font-medium text-danger">
                    Lead rejected
                    <span className="font-normal text-muted">
                      {rejectedByName(c) ? ` by ${rejectedByName(c)}` : ""}
                      {c.rejected_at ? ` on ${fmtDate(c.rejected_at)}` : ""}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-ink">{c.reject_reason}</p>
                  <p className="mt-1 text-xs text-muted">Left out of the deal, paid and remaining totals. Reopen it to book stalls or take payments again.</p>
                </div>
                <Button variant="secondary" className="shrink-0" loading={reopenMut.isPending} onClick={() => reopenMut.mutate(c._id)}>
                  <RotateCcw className="size-4" aria-hidden />
                  Reopen
                </Button>
              </div>
            )}
            {reopenMut.error && <p className="mt-2 text-sm text-danger">{reopenMut.error.message}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              <StatTile label="Exhibitions" value={fmt(c.exhibition.length)} />
              <StatTile label="Stalls" value={fmt(totals.stalls)} />
              <StatTile label="Deal value" value={fmtMoney(totals.deal)} />
              <StatTile label="Paid" value={fmtMoney(totals.paid)} tone="success" />
              <StatTile label="Remaining" value={fmtMoney(totals.remaining)} tone={totals.remaining > 0 ? "warn" : undefined} />
            </div>

            {makeFinalMut.error && (
              <div className="mt-6">
                <Alert>{makeFinalMut.error.message}</Alert>
              </div>
            )}

            {c.exhibition.length === 0 ? (
              <div className="mt-8">
                <EmptyState icon={<CalendarDays className="size-6" />} title="Not booked for any exhibition yet" action={c.rejected ? undefined : <Button onClick={() => setAddingExhibition(true)}>Book for an exhibition</Button>}>
                  Book this client for an exhibition, then add their stalls.
                </EmptyState>
              </div>
            ) : (
              c.exhibition.map((entry) => {
                const exhibitionId = exhibitionRefId(entry.exhibition);
                const exhibitionName = exhibitionRefName(entry.exhibition);
                const gone = Boolean(entry.exhibition && typeof entry.exhibition === "object" && entry.exhibition.deleted);
                const designs = entry.designs.map(designOf).filter((d): d is Design => d != null);
                const nextOptionNo = designs.length > 0 ? Math.max(...designs.map((d) => d.option_no)) + 1 : 1;

                return (
                  <Section
                    key={entry._id}
                    title={exhibitionName}
                    description={`Deal ${fmtMoney(entry.total_deal_amount)} · Paid ${fmtMoney(entry.total_paid)} · Remaining ${fmtMoney(entry.total_remaining)}`}
                    action={
                      <div className="flex gap-2">
                        <Button variant="secondary" className="h-8 px-2.5" disabled={Boolean(c.rejected) || gone} onClick={() => setStallDialog({ exhibitionId, stall: null })}>
                          <Plus className="size-3.5" aria-hidden />
                          Add stall
                        </Button>
                        {canRemove && (
                          <Button
                            variant="ghost"
                            className="h-8 px-2.5 text-muted hover:text-danger"
                            onClick={() => setRemovingExhibition(entry)}
                            aria-label={`Remove ${exhibitionName}`}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        )}
                      </div>
                    }
                  >
                    {entry.stalls.length === 0 ? (
                      <EmptyNote>No stalls here yet.</EmptyNote>
                    ) : (
                      <TableWrap>
                        <table className="w-full text-sm">
                          <thead className="border-b border-line bg-surface-2/50">
                            <tr>
                              <th className={th}>Stall</th>
                              <th className={th}>Status</th>
                              <th className={`${th} text-right`}>Deal</th>
                              <th className={`${th} text-right`}>Paid</th>
                              <th className={`${th} text-right`}>Remaining</th>
                              <th className={th}>
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {entry.stalls.map((stall) => {
                              const status = stallStatus(stall);
                              return (
                                <tr key={stall._id} className={stall.rejected ? "bg-danger-soft/30" : undefined}>
                                  <td className={`${td} whitespace-normal`}>
                                    <div className="font-medium">{stall.stall_name || stall.stall_no || "Stall"}</div>
                                    {stall.stall_size && <div className="text-xs text-muted">{stall.stall_size}</div>}
                                  </td>
                                  <td className={td}>
                                    <DealStatusBadge status={status} />
                                  </td>
                                  <td className={`${td} text-right tabular-nums ${stall.rejected ? "text-muted line-through" : ""}`}>{fmtMoney(stall.deal_amount)}</td>
                                  <td className={`${td} text-right`}>
                                    {stall.rejected ? <span className="text-muted">—</span> : <Count n={stall.total_paid} tone="success" money />}
                                  </td>
                                  <td className={`${td} text-right`}>
                                    {stall.rejected ? <span className="text-muted">—</span> : <Count n={stall.remaining_payment} tone="warn" money />}
                                  </td>
                                  <td className={`${td} text-right`}>
                                    <div className="flex justify-end gap-1">
                                      {!stall.rejected && (
                                        <Button
                                          variant="ghost"
                                          className="h-8 px-2 text-accent hover:bg-accent-soft"
                                          onClick={() => setPayingStall({ exhibitionId, stall })}
                                        >
                                          <Wallet className="size-3.5" aria-hidden />
                                          Payment
                                        </Button>
                                      )}
                                      <Button variant="ghost" className="h-8 px-2" onClick={() => setStallDialog({ exhibitionId, stall })} aria-label="Edit stall">
                                        <Pencil className="size-3.5" aria-hidden />
                                      </Button>
                                      {canRemove && (
                                        <Button
                                          variant="ghost"
                                          className="h-8 px-2 hover:text-danger"
                                          onClick={() => setRemovingStall({ exhibitionId, stall })}
                                          aria-label="Remove stall"
                                        >
                                          <Trash2 className="size-3.5" aria-hidden />
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </TableWrap>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted">Design options</h3>
                      <Button
                        variant="secondary"
                        className="h-8 px-2.5"
                        disabled={gone}
                        onClick={() => setDesignDialog({ exhibitionId, nextOptionNo, design: null })}
                      >
                        <Plus className="size-3.5" aria-hidden />
                        Add design
                      </Button>
                    </div>
                    {designs.length === 0 ? (
                      <p className="mt-2 text-sm text-muted">No design options yet.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {designs.map((d) => (
                          <span
                            key={d._id}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
                              d.isfinal ? "border-accent bg-accent-soft" : "border-line bg-surface"
                            }`}
                          >
                            {d.isfinal && <Star className="size-3 fill-current text-accent" aria-hidden />}
                            Option {d.option_no}
                            {d.remarks && <span className="text-muted">— {d.remarks}</span>}
                            {!d.isfinal && (
                              <button
                                type="button"
                                className="font-medium text-accent hover:underline"
                                disabled={makeFinalMut.isPending}
                                onClick={() => makeFinalMut.mutate(d._id)}
                              >
                                Mark final
                              </button>
                            )}
                            <button
                              type="button"
                              className="text-muted hover:text-ink"
                              onClick={() => setDesignDialog({ exhibitionId, nextOptionNo, design: d })}
                              aria-label={`Edit option ${d.option_no}`}
                            >
                              <Pencil className="size-3" aria-hidden />
                            </button>
                            {me && mayDelete(me, d.createdBy) && (
                              <button
                                type="button"
                                className="text-muted hover:text-danger"
                                onClick={() => setRemovingDesign(d)}
                                aria-label={`Delete option ${d.option_no}`}
                              >
                                <Trash2 className="size-3" aria-hidden />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </Section>
                );
              })
            )}

            <ClientDialog open={editing} client={editing ? c : null} onClose={() => setEditing(false)} />

            <ConfirmDialog
              open={deleting}
              title={`Delete ${c.clientName}?`}
              confirmLabel="Delete client"
              pending={remove.isPending}
              error={remove.error?.message}
              onClose={() => {
                setDeleting(false);
                remove.reset();
              }}
              onConfirm={() => remove.mutate(c._id, { onSuccess: () => router.push("/modules/client") })}
            >
              {totals.stalls > 0 ? (
                <>
                  This client has <strong className="text-ink">{fmt(totals.stalls)} stalls</strong>, with {fmtMoney(totals.remaining)} still
                  remaining, and any design options will also be deleted. This can&apos;t be undone.
                </>
              ) : (
                <>This can&apos;t be undone.</>
              )}
            </ConfirmDialog>

            <AddExhibitionDialog open={addingExhibition} onClose={() => setAddingExhibition(false)} clientId={c._id} already={c.exhibition} />

            <ConfirmDialog
              open={Boolean(removingExhibition)}
              title={`Remove ${removingExhibition ? exhibitionRefName(removingExhibition.exhibition) : ""}?`}
              confirmLabel="Remove"
              pending={removeExhibition.isPending}
              error={removeExhibition.error?.message}
              onClose={() => {
                setRemovingExhibition(null);
                removeExhibition.reset();
              }}
              onConfirm={() =>
                removingExhibition &&
                removeExhibition.mutate(
                  { clientId: c._id, exhibitionId: exhibitionRefId(removingExhibition.exhibition) },
                  { onSuccess: () => setRemovingExhibition(null) },
                )
              }
            >
              {removingExhibition && removingExhibition.stalls.some((s) => s.total_paid > 0) ? (
                <>Payments are recorded here, so this booking can&apos;t be removed. If that&apos;s a mistake, set them to 0 first.</>
              ) : removingExhibition && removingExhibition.stalls.length > 0 ? (
                <>
                  This removes all <strong className="text-ink">{fmt(removingExhibition.stalls.length)} stalls</strong> here, including{" "}
                  {fmtMoney(removingExhibition.total_remaining)} still remaining, and any design options. This can&apos;t be undone.
                </>
              ) : (
                <>Any design options here are removed too. This can&apos;t be undone.</>
              )}
            </ConfirmDialog>

            {stallDialog && (
              <StallDialog open onClose={() => setStallDialog(null)} clientId={c._id} exhibitionId={stallDialog.exhibitionId} stall={stallDialog.stall} />
            )}

            <ConfirmDialog
              open={Boolean(removingStall)}
              title="Remove this stall?"
              confirmLabel="Remove stall"
              pending={removeStallMut.isPending}
              error={removeStallMut.error?.message}
              onClose={() => {
                setRemovingStall(null);
                removeStallMut.reset();
              }}
              onConfirm={() =>
                removingStall &&
                removeStallMut.mutate(
                  { clientId: c._id, exhibitionId: removingStall.exhibitionId, stallId: removingStall.stall._id },
                  { onSuccess: () => setRemovingStall(null) },
                )
              }
            >
              {removingStall && removingStall.stall.total_paid > 0 ? (
                <>
                  {fmtMoney(removingStall.stall.total_paid)} is recorded as paid on this stall, so it can&apos;t be removed. If that&apos;s a mistake, set its
                  payments to 0 first.
                </>
              ) : (
                <>This can&apos;t be undone.</>
              )}
            </ConfirmDialog>

            {payingStall && (
              <StallPaymentDialog open onClose={() => setPayingStall(null)} clientId={c._id} exhibitionId={payingStall.exhibitionId} stall={payingStall.stall} />
            )}


            {designDialog && (
              <DesignDialog
                open
                onClose={() => setDesignDialog(null)}
                clientId={c._id}
                exhibitionId={designDialog.exhibitionId}
                nextOptionNo={designDialog.nextOptionNo}
                design={designDialog.design}
              />
            )}

            <ConfirmDialog
              open={Boolean(removingDesign)}
              title={`Delete design option ${removingDesign?.option_no ?? ""}?`}
              confirmLabel="Delete design"
              pending={removeDesignMut.isPending}
              error={removeDesignMut.error?.message}
              onClose={() => {
                setRemovingDesign(null);
                removeDesignMut.reset();
              }}
              onConfirm={() => removingDesign && removeDesignMut.mutate(removingDesign._id, { onSuccess: () => setRemovingDesign(null) })}
            >
              This can&apos;t be undone.
            </ConfirmDialog>
          </>
        );
      }}
    </QueryState>
  );
}
