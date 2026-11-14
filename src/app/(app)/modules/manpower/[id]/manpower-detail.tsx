"use client";

import { CalendarDays, Pencil, Phone, Plus, SearchX, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import { BackLink, Count, EmptyNote, EmptyState, QueryState, Section, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { ApiError } from "@/lib/api";
import {
  deletePerson,
  deleteWorkPayment,
  fmt,
  fmtDate,
  fmtMoney,
  useManpowerMutation,
  usePersonHistory,
  WORK_TYPE_LABELS,
  type PersonHistoryEntry,
  type WorkPayment,
} from "@/lib/manpower";
import { PersonDialog } from "../_components/person-dialog";
import { WorkPaymentDialog } from "../_components/work-payment-dialog";

// Reconstructs a WorkPayment-shaped object from one row of the grouped
// history response, so edit/delete don't need an extra round trip.
function toWorkPayment(entry: PersonHistoryEntry, personId: string, personName: string, workType: "DAY_WAGE" | "TENDER", row: PersonHistoryEntry["dayWage"][number] | PersonHistoryEntry["tender"][number]): WorkPayment {
  const base = {
    _id: row._id,
    exhibition: entry.exhibition ?? "",
    person: personId,
    personName,
    workType,
    rate: row.rate,
    totalAmount: row.total,
    remarks: row.remarks,
    createdAt: row.createdAt,
  };
  if (workType === "DAY_WAGE") {
    const r = row as PersonHistoryEntry["dayWage"][number];
    return { ...base, labourType: r.labourType, wageDays: r.wageDays };
  }
  const r = row as PersonHistoryEntry["tender"][number];
  return { ...base, stallName: r.stallName, stallNo: r.stallNo, size: r.size };
}

export function ManpowerDetail() {
  const { id } = useParams<{ id: string }>();
  const history = usePersonHistory(id);

  const [editingPerson, setEditingPerson] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState(false);
  const [workDialog, setWorkDialog] = useState<{ workPayment: WorkPayment | null } | null>(null);
  const [deletingWork, setDeletingWork] = useState<WorkPayment | null>(null);

  const removePerson = useManpowerMutation((pid: string) => deletePerson(pid));
  const removeWork = useManpowerMutation((wid: string) => deleteWorkPayment(wid));

  if (history.error instanceof ApiError && [400, 404].includes(history.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Worker not found" action={<BackLink href="/modules/manpower">Back to manpower</BackLink>}>
        They may have been deleted.
      </EmptyState>
    );
  }

  return (
    <QueryState queries={[history]}>
      {() => {
        const h = history.data!;

        return (
          <>
            <BackLink href="/modules/manpower">← All workers</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{h.name}</h2>
                {h.phone && (
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
                    <Phone className="size-3.5" aria-hidden />
                    {h.phone}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditingPerson(true)}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                <Button variant="secondary" className="hover:text-danger" onClick={() => setDeletingPerson(true)}>
                  <Trash2 className="size-4" aria-hidden />
                  Delete
                </Button>
                <Button onClick={() => setWorkDialog({ workPayment: null })}>
                  <Plus className="size-4" aria-hidden />
                  Add work payment
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Exhibitions" value={fmt(h.history.length)} />
              <StatTile label="Total paid" value={fmtMoney(h.grandTotal)} tone="success" />
            </div>

            {h.history.length === 0 ? (
              <div className="mt-8">
                <EmptyState icon={<CalendarDays className="size-6" />} title="No work payments yet" action={<Button onClick={() => setWorkDialog({ workPayment: null })}>Add a work payment</Button>}>
                  Record their day-wage or tender work at an exhibition.
                </EmptyState>
              </div>
            ) : (
              h.history.map((entry, entryIdx) => (
                <Section
                  key={entry.exhibition?._id ?? `unknown-${entryIdx}`}
                  title={entry.exhibition?.name ?? "Unknown exhibition"}
                  description={`Day wages ${fmtMoney(entry.dayWageTotal)} · Tender ${fmtMoney(entry.tenderTotal)} · Total ${fmtMoney(entry.exhibitionTotal)}`}
                >
                  {entry.dayWage.length === 0 && entry.tender.length === 0 ? (
                    <EmptyNote>No work payments here.</EmptyNote>
                  ) : (
                    <TableWrap>
                      <table className="w-full text-sm">
                        <thead className="border-b border-line bg-surface-2/50">
                          <tr>
                            <th className={th}>Type</th>
                            <th className={th}>Details</th>
                            <th className={`${th} text-right`}>Rate</th>
                            <th className={`${th} text-right`}>Total</th>
                            <th className={th}>Date</th>
                            <th className={th}>
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {entry.dayWage.map((row) => (
                            <tr key={row._id}>
                              <td className={`${td} text-muted`}>{WORK_TYPE_LABELS.DAY_WAGE}</td>
                              <td className={td}>
                                {row.labourType && <div>{row.labourType}</div>}
                                <div className="text-xs text-muted">{fmt(row.wageDays)} days</div>
                                {row.remarks && <div className="text-xs text-muted">{row.remarks}</div>}
                              </td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.rate)}</td>
                              <td className={`${td} text-right`}>
                                <Count n={row.total} tone="success" money />
                              </td>
                              <td className={`${td} text-muted`}>{fmtDate(row.createdAt)}</td>
                              <td className={`${td} text-right`}>
                                <RowActions
                                  onEdit={() => setWorkDialog({ workPayment: toWorkPayment(entry, id, h.name, "DAY_WAGE", row) })}
                                  onDelete={() => setDeletingWork(toWorkPayment(entry, id, h.name, "DAY_WAGE", row))}
                                />
                              </td>
                            </tr>
                          ))}
                          {entry.tender.map((row) => (
                            <tr key={row._id}>
                              <td className={`${td} text-muted`}>{WORK_TYPE_LABELS.TENDER}</td>
                              <td className={td}>
                                {(row.stallName || row.stallNo) && (
                                  <div>
                                    {row.stallName}
                                    {row.stallNo ? ` (${row.stallNo})` : ""}
                                  </div>
                                )}
                                <div className="text-xs text-muted">size {fmt(row.size)}</div>
                                {row.remarks && <div className="text-xs text-muted">{row.remarks}</div>}
                              </td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.rate)}</td>
                              <td className={`${td} text-right`}>
                                <Count n={row.total} tone="success" money />
                              </td>
                              <td className={`${td} text-muted`}>{fmtDate(row.createdAt)}</td>
                              <td className={`${td} text-right`}>
                                <RowActions
                                  onEdit={() => setWorkDialog({ workPayment: toWorkPayment(entry, id, h.name, "TENDER", row) })}
                                  onDelete={() => setDeletingWork(toWorkPayment(entry, id, h.name, "TENDER", row))}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableWrap>
                  )}
                </Section>
              ))
            )}

            <PersonDialog open={editingPerson} person={{ _id: h._id, name: h.name, phone: h.phone }} onClose={() => setEditingPerson(false)} />

            <ConfirmDialog
              open={deletingPerson}
              title={`Delete ${h.name}?`}
              confirmLabel="Delete worker"
              pending={removePerson.isPending}
              error={removePerson.error?.message}
              onClose={() => {
                setDeletingPerson(false);
                removePerson.reset();
              }}
              onConfirm={() => removePerson.mutate(h._id)}
            >
              Their recorded work payments stay on file, but will no longer show up grouped under their name. This can&apos;t be undone.
            </ConfirmDialog>

            {workDialog && <WorkPaymentDialog open onClose={() => setWorkDialog(null)} personId={h._id} workPayment={workDialog.workPayment} />}

            <ConfirmDialog
              open={Boolean(deletingWork)}
              title="Delete this work payment?"
              confirmLabel="Delete"
              pending={removeWork.isPending}
              error={removeWork.error?.message}
              onClose={() => {
                setDeletingWork(null);
                removeWork.reset();
              }}
              onConfirm={() => deletingWork && removeWork.mutate(deletingWork._id, { onSuccess: () => setDeletingWork(null) })}
            >
              This can&apos;t be undone.
            </ConfirmDialog>
          </>
        );
      }}
    </QueryState>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" className="h-8 px-2" onClick={onEdit} aria-label="Edit">
        <Pencil className="size-3.5" aria-hidden />
      </Button>
      <Button variant="ghost" className="h-8 px-2 hover:text-danger" onClick={onDelete} aria-label="Delete">
        <Trash2 className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}
