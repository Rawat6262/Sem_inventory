"use client";

import { ChevronRight, MapPin, Phone, Plus, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import { Count, EmptyState, QueryState, SearchBox, TableWrap, td, th } from "@/components/data-ui";
import { deleteTransporter, useTransportMutation, useTransporters, type Transporter } from "@/lib/transport";
import { TransporterDialog } from "./_components/transporter-dialog";

export function TransportView() {
  const transporters = useTransporters();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Transporter | null | "new">(null);
  const [deleting, setDeleting] = useState<Transporter | null>(null);
  const remove = useTransportMutation((id: string) => deleteTransporter(id));

  const q = search.trim().toLowerCase();
  const list = useMemo(
    () =>
      (transporters.data ?? []).filter(
        (t) => !q || t.transporter_name.toLowerCase().includes(q) || t.phone_number.includes(q) || t.city?.toLowerCase().includes(q),
      ),
    [transporters.data, q],
  );

  return (
    <QueryState queries={[transporters]}>
      {() => (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name, phone or city" />
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Add transporter
            </Button>
          </div>

          {transporters.data?.length === 0 ? (
            <EmptyState icon={<Truck className="size-6" />} title="No transporters yet" action={<Button onClick={() => setEditing("new")}>Add the first transporter</Button>}>
              Add a transporter to start recording trip charges and payments.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No transporters match &ldquo;{search}&rdquo;.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Location</th>
                    <th className={th}>Phone</th>
                    <th className={`${th} text-right`}>Exhibitions</th>
                    <th className={`${th} text-right`}>Paid</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((t) => (
                    <tr key={t._id} className="hover:bg-surface-2/40">
                      <td className={td}>
                        <Link href={`/modules/transport/${t._id}`} className="font-medium hover:text-accent hover:underline">
                          {t.transporter_name}
                        </Link>
                      </td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <MapPin className="size-3.5" aria-hidden />
                          {[t.city, t.state].filter(Boolean).join(", ") || "—"}
                        </span>
                      </td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <Phone className="size-3.5" aria-hidden />
                          {t.phone_number}
                        </span>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{t.exhibition?.length ?? 0}</td>
                      <td className={`${td} text-right`}>
                        <Count n={t.overall_paid ?? 0} tone="success" money />
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/modules/transport/${t._id}`}
                            className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                          >
                            View
                            <ChevronRight className="size-3.5" aria-hidden />
                          </Link>
                          <Button variant="ghost" className="h-8 px-2.5" onClick={() => setEditing(t)}>
                            Edit
                          </Button>
                          <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(t)} aria-label={`Delete ${t.transporter_name}`}>
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}

          <TransporterDialog open={editing !== null} transporter={editing === "new" ? null : editing} onClose={() => setEditing(null)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.transporter_name ?? ""}?`}
            confirmLabel="Delete transporter"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            Their trip charges and payment history stay on record. This can&apos;t be undone.
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
