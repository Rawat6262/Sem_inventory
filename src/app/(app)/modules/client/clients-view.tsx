"use client";

import { ChevronRight, Handshake, Phone, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import { Count, EmptyState, QueryState, SearchBox, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { clientTotals, deleteClient, fmt, fmtMoney, useClients, useClientsMutation, type Client } from "@/lib/clients";
import { ClientDialog } from "./_components/client-dialog";

export function ClientsView() {
  const clients = useClients();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null | "new">(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const remove = useClientsMutation((id: string) => deleteClient(id));

  const overall = useMemo(() => {
    const list = clients.data ?? [];
    return list.reduce(
      (acc, c) => {
        const t = clientTotals(c);
        return { deal: acc.deal + t.deal, paid: acc.paid + t.paid, remaining: acc.remaining + t.remaining };
      },
      { deal: 0, paid: 0, remaining: 0 },
    );
  }, [clients.data]);

  const q = search.trim().toLowerCase();
  const list = (clients.data ?? []).filter(
    (c) =>
      !q ||
      c.clientName.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q) ||
      c.phoneNumber?.includes(q) ||
      c.address?.toLowerCase().includes(q),
  );

  return (
    <QueryState queries={[clients]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Clients" value={fmt(clients.data?.length)} />
            <StatTile label="Total deal value" value={fmtMoney(overall.deal)} />
            <StatTile label="Paid" value={fmtMoney(overall.paid)} tone="success" />
            <StatTile label="Remaining" value={fmtMoney(overall.remaining)} tone={overall.remaining > 0 ? "warn" : undefined} />
          </div>

          <div className="mt-8 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name, company, phone or address" />
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Add client
            </Button>
          </div>

          {clients.data?.length === 0 ? (
            <EmptyState icon={<Handshake className="size-6" />} title="No clients yet" action={<Button onClick={() => setEditing("new")}>Add the first client</Button>}>
              Add a client, then book them for an exhibition.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No clients match these filters.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Company</th>
                    <th className={th}>Phone</th>
                    <th className={`${th} text-right`}>Exhibitions</th>
                    <th className={`${th} text-right`}>Deal</th>
                    <th className={`${th} text-right`}>Paid</th>
                    <th className={`${th} text-right`}>Remaining</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((c) => {
                    const t = clientTotals(c);
                    return (
                      <tr key={c._id} className="hover:bg-surface-2/40">
                        <td className={td}>
                          <Link href={`/modules/client/${c._id}`} className="font-medium hover:text-accent hover:underline">
                            {c.clientName}
                          </Link>
                        </td>
                        <td className={`${td} text-muted`}>{c.companyName || "—"}</td>
                        <td className={td}>
                          <span className="inline-flex items-center gap-1 text-muted">
                            <Phone className="size-3.5" aria-hidden />
                            {c.phoneNumber}
                          </span>
                        </td>
                        <td className={`${td} text-right tabular-nums`}>{fmt(c.exhibition.length)}</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtMoney(t.deal)}</td>
                        <td className={`${td} text-right`}>
                          <Count n={t.paid} tone="success" money />
                        </td>
                        <td className={`${td} text-right`}>
                          <Count n={t.remaining} tone="warn" money />
                        </td>
                        <td className={`${td} text-right`}>
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/modules/client/${c._id}`}
                              className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                            >
                              View
                              <ChevronRight className="size-3.5" aria-hidden />
                            </Link>
                            <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.clientName}`}>
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

          <ClientDialog open={editing !== null} client={editing === "new" ? null : editing} onClose={() => setEditing(null)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.clientName ?? ""}?`}
            confirmLabel="Delete client"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            {(() => {
              const t = deleting ? clientTotals(deleting) : null;
              return t && t.stalls > 0 ? (
                <>
                  This client has <strong className="text-ink">{fmt(t.stalls)} stalls</strong> across exhibitions, with {fmtMoney(t.remaining)}{" "}
                  still remaining, and any design options will also be deleted. This can&apos;t be undone.
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
