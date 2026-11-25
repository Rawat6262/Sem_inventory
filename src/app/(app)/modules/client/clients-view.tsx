"use client";

import { Ban, ChevronRight, Handshake, Phone, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Paged } from "@/components/pagination";
import { Button, Select } from "@/components/ui";
import { Count, EmptyState, QueryState, SearchBox, Section, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { useMe } from "@/hooks/use-me";
import { isGrantedModule, mayDelete, ownsRecordsOnly } from "@/lib/permissions";
import {
  addedByName,
  clientStatus,
  clientTotals,
  DEAL_STATUS_LABELS,
  DEAL_STATUSES,
  deleteClient,
  fmt,
  fmtMoney,
  rejectedByName,
  useClientDirectory,
  useClients,
  useClientsMutation,
  type Client,
  type DealStatus,
} from "@/lib/clients";
import { ClientDialog } from "./_components/client-dialog";
import { DealStatusBadge } from "./_components/deal-status-badge";
import { RejectClientDialog } from "./_components/reject-client-dialog";

export function ClientsView() {
  const clients = useClients();
  const me = useMe().data;
  const ownOnly = Boolean(me && (ownsRecordsOnly(me.role) || isGrantedModule(me.role, "client", me.extraModules)));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DealStatus | "">("");
  const [editing, setEditing] = useState<Client | null | "new">(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [rejecting, setRejecting] = useState<Client | null>(null);
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

  const statusCounts = useMemo(() => {
    const counts: Record<DealStatus, number> = { lead: 0, final: 0, fully_paid: 0, rejected: 0 };
    for (const c of clients.data ?? []) counts[clientStatus(c)] += 1;
    return counts;
  }, [clients.data]);

  const q = search.trim().toLowerCase();
  const list = (clients.data ?? []).filter(
    (c) =>
      (!status || clientStatus(c) === status) &&
      (!q ||
        c.clientName.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        c.phoneNumber?.includes(q) ||
        c.address?.toLowerCase().includes(q)),
  );

  return (
    <QueryState queries={[clients]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label={ownOnly ? "My clients" : "Clients"} value={fmt(clients.data?.length)} />
            <StatTile label="Total deal value" value={fmtMoney(overall.deal)} />
            <StatTile label="Paid" value={fmtMoney(overall.paid)} tone="success" />
            <StatTile label="Remaining" value={fmtMoney(overall.remaining)} tone={overall.remaining > 0 ? "warn" : undefined} />
          </div>

          <div className="mt-8 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search by name, company, phone or address" />
              <Select aria-label="Filter by status" className="sm:w-48" value={status} onChange={(e) => setStatus(e.target.value as DealStatus | "")}>
                <option value="">All statuses ({fmt(clients.data?.length)})</option>
                {DEAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {DEAL_STATUS_LABELS[s]} ({fmt(statusCounts[s])})
                  </option>
                ))}
              </Select>
            </div>
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
            <Paged items={list} resetKey={`${search}|${status}`}>
              {(pageRows) => (
                <TableWrap>
                  <table className="w-full text-sm">
                    <thead className="border-b border-line bg-surface-2/50">
                      <tr>
                        <th className={th}>Company</th>
                        <th className={th}>Client</th>
                        <th className={th}>Phone</th>
                        <th className={th}>Status</th>
                        {!ownOnly && <th className={th}>Added by</th>}
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
                      {pageRows.map((c) => {
                        const t = clientTotals(c);
                        const rowStatus = clientStatus(c);
                        return (
                          <tr key={c._id} className="hover:bg-surface-2/40">
                            <td className={td}>
                              <Link href={`/modules/client/${c._id}`} className="font-medium hover:text-accent hover:underline">
                                {c.companyName || c.clientName}
                              </Link>
                            </td>
                            <td className={`${td} text-muted`}>{c.clientName}</td>
                            <td className={td}>
                              <span className="inline-flex items-center gap-1 text-muted">
                                <Phone className="size-3.5" aria-hidden />
                                {c.phoneNumber}
                              </span>
                            </td>
                            <td className={td}>
                              <DealStatusBadge status={rowStatus} />
                              {c.rejected && c.reject_reason && (
                                <div className="mt-1 max-w-48 truncate text-xs text-muted" title={`${c.reject_reason}${rejectedByName(c) ? ` (rejected by ${rejectedByName(c)})` : ""}`}>
                                  {c.reject_reason}
                                </div>
                              )}
                            </td>
                            {!ownOnly && <td className={`${td} text-muted`}>{addedByName(c) ?? "—"}</td>}
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
                                {rowStatus === "lead" && (
                                  <Button variant="ghost" className="h-8 px-2.5 text-danger hover:bg-danger-soft" onClick={() => setRejecting(c)}>
                                    <Ban className="size-3.5" aria-hidden />
                                    Reject
                                  </Button>
                                )}
                                <Link
                                  href={`/modules/client/${c._id}`}
                                  className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                                >
                                  View
                                  <ChevronRight className="size-3.5" aria-hidden />
                                </Link>
                                {me && mayDelete(me, c.createdBy) && (
                                  <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.clientName}`}>
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
            </Paged>
          )}

          {ownOnly && <ClientDirectory />}

          {rejecting && <RejectClientDialog client={rejecting} onClose={() => setRejecting(null)} />}

          <ClientDialog open={editing !== null} client={editing === "new" ? null : editing} onClose={() => setEditing(null)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.companyName || deleting?.clientName || ""}?`}
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

// Companies other users already work with. Only names are shown; to work with
// one of these, ask the person who added it to share it.
function ClientDirectory() {
  const directory = useClientDirectory(true);
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const list = (directory.data ?? []).filter(
    (c) => !q || c.companyName.toLowerCase().includes(q) || c.clientName.toLowerCase().includes(q) || c.addedBy?.toLowerCase().includes(q),
  );

  return (
    <Section
        title="Clients added by others"
        description="Companies your colleagues already work with. To work with one, ask the person who added it to share it with you."
      >
        <QueryState queries={[directory]}>
          {() =>
            directory.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No other users have added clients yet.</p>
            ) : (
              <>
                <div className="mb-3">
                  <SearchBox value={search} onChange={setSearch} placeholder="Search companies" />
                </div>
                <Paged items={list} resetKey={search}>
                  {(pageRows) => (
                    <TableWrap>
                      <table className="w-full text-sm">
                        <thead className="border-b border-line bg-surface-2/50">
                          <tr>
                            <th className={th}>Company</th>
                            <th className={th}>Client</th>
                            <th className={th}>Added by</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {pageRows.map((c) => (
                            <tr key={c._id}>
                              <td className={`${td} font-medium`}>{c.companyName || "—"}</td>
                              <td className={`${td} text-muted`}>{c.clientName}</td>
                              <td className={`${td} text-muted`}>{c.addedBy ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">No companies match &ldquo;{search}&rdquo;.</p>}
                    </TableWrap>
                  )}
                </Paged>
              </>
            )
          }
        </QueryState>
      </Section>
  );
}
