"use client";

import {
  CalendarDays,
  ChartColumn,
  Handshake,
  Mail,
  MapPin,
  Pencil,
  Phone,
  SearchX,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import {
  BackLink,
  EmptyState,
  QueryState,
  Section,
  StatTile,
  TableWrap,
  td,
  th,
} from "@/components/data-ui";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";
import { canEditOwnRecord, canManageExhibitions, canOpen, isGrantedModule, mayDelete, ownsRecordsOnly } from "@/lib/permissions";
import {
  dateRange,
  deleteExhibition,
  fmt,
  fmtMoney,
  useExhibition,
  useExhibitionClients,
  useExhibitionsMutation,
} from "@/lib/exhibitions";
import { ExhibitionDialog } from "../_components/exhibition-dialog";

export function ExhibitionDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const exhibition = useExhibition(id);
  const meQuery = useMe();
  const me = meQuery.data;
  // Roles without the Clients module (e.g. supervisor) see the exhibition only.
  const showClients = Boolean(me && canOpen(me.role, "client", me.extraModules));
  const manage = Boolean(me && canManageExhibitions(me.role));
  const ownClientsOnly = Boolean(
    me && (ownsRecordsOnly(me.role) || isGrantedModule(me.role, "client", me.extraModules)),
  );
  const clients = useExhibitionClients(id, showClients);

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = useExhibitionsMutation((eid: string) => deleteExhibition(eid));

  const totals = useMemo(() => {
    const rows = clients.data ?? [];
    return rows.reduce(
      (acc, r) => ({
        stalls: acc.stalls + r.stalls.length,
        deal: acc.deal + r.totals.total_deal_amount,
        paid: acc.paid + r.totals.total_paid,
        remaining: acc.remaining + r.totals.total_remaining,
      }),
      { stalls: 0, deal: 0, paid: 0, remaining: 0 },
    );
  }, [clients.data]);

  if (
    exhibition.error instanceof ApiError &&
    [400, 404].includes(exhibition.error.status)
  ) {
    return (
      <EmptyState
        icon={<SearchX className="size-6" />}
        title="Exhibition not found"
        action={
          <BackLink href="/modules/exhibitions">Back to exhibitions</BackLink>
        }
      >
        It may have been deleted.
      </EmptyState>
    );
  }

  return (
    <QueryState
      queries={
        showClients ? [exhibition, meQuery, clients] : [exhibition, meQuery]
      }
    >
      {() => {
        const e = exhibition.data!;
        const rows = clients.data ?? [];

        return (
          <>
            <BackLink href="/modules/exhibitions">← All exhibitions</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{e.name}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {e.venue}, {e.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {dateRange(e)}
                  </span>
                  {e.organiser && (
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium">
                      {e.organiser}
                    </span>
                  )}
                  {e.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3.5" aria-hidden />
                      {e.email}
                    </span>
                  )}
                  {e.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3.5" aria-hidden />
                      {e.phone}
                    </span>
                  )}
                </p>
                {e.remarks && (
                  <p className="mt-2 text-sm text-muted">{e.remarks}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {me && manage && canEditOwnRecord(me, e.createdBy) && (
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </Button>
                )}
                {me && manage && mayDelete(me, e.createdBy) && (
                  <Button
                    variant="secondary"
                    className="hover:text-danger"
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                )}
                {me && canOpen(me.role, "reports") && (
                  <Link href={`/modules/reports/exhibitions/${e._id}`}>
                    <Button variant="secondary">
                      <ChartColumn className="size-4" aria-hidden />
                      Full financial summary
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {showClients && (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                  <StatTile label="Clients" value={fmt(rows.length)} />
                  <StatTile label="Stalls" value={fmt(totals.stalls)} />
                  <StatTile label="Deal value" value={fmtMoney(totals.deal)} />
                  <StatTile
                    label="Paid"
                    value={fmtMoney(totals.paid)}
                    tone="success"
                  />
                  <StatTile
                    label="Remaining"
                    value={fmtMoney(totals.remaining)}
                    tone={totals.remaining > 0 ? "warn" : undefined}
                  />
                </div>

                <Section
                  title={ownClientsOnly ? "Your clients booked" : "Clients booked"}
                  description={
                    ownClientsOnly
                      ? "Only clients you added are shown here."
                      : "Who's taken a stall at this exhibition"
                  }
                >
                  {rows.length === 0 ? (
                    <EmptyState
                      icon={<Users className="size-6" />}
                      title="No clients booked yet"
                      action={
                        <Link href="/modules/client">
                          <Button>
                            <Handshake className="size-4" aria-hidden />
                            Go to Clients
                          </Button>
                        </Link>
                      }
                    >
                      Book a client for this exhibition from the Clients module.
                    </EmptyState>
                  ) : (
                    <TableWrap>
                      <table className="w-full text-sm">
                        <thead className="border-b border-line bg-surface-2/50">
                          <tr>
                            <th className={th}>Client</th>
                            <th className={th}>Phone</th>
                            <th className={`${th} text-right`}>Stalls</th>
                            <th className={`${th} text-right`}>Deal</th>
                            <th className={`${th} text-right`}>Paid</th>
                            <th className={`${th} text-right`}>Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {rows.map((r) => (
                            <tr
                              key={r.clientId}
                              className="hover:bg-surface-2/40"
                            >
                              <td className={td}>
                                <Link
                                  href={`/modules/client/${r.clientId}`}
                                  className="font-medium hover:text-accent hover:underline"
                                >
                                  {r.clientName}
                                </Link>
                                {r.companyName && (
                                  <div className="text-xs text-muted">
                                    {r.companyName}
                                  </div>
                                )}
                              </td>
                              <td className={`${td} text-muted`}>
                                {r.phoneNumber}
                              </td>
                              <td className={`${td} text-right tabular-nums`}>
                                {fmt(r.stalls.length)}
                              </td>
                              <td className={`${td} text-right tabular-nums`}>
                                {fmtMoney(r.totals.total_deal_amount)}
                              </td>
                              <td
                                className={`${td} text-right tabular-nums text-success`}
                              >
                                {fmtMoney(r.totals.total_paid)}
                              </td>
                              <td
                                className={`${td} text-right tabular-nums ${r.totals.total_remaining > 0 ? "text-warn" : ""}`}
                              >
                                {fmtMoney(r.totals.total_remaining)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableWrap>
                  )}
                </Section>
              </>
            )}

            <ExhibitionDialog
              open={editing}
              exhibition={editing ? e : null}
              onClose={() => setEditing(false)}
            />

            <ConfirmDialog
              open={deleting}
              title={`Delete ${e.name}?`}
              confirmLabel="Delete exhibition"
              pending={remove.isPending}
              error={remove.error?.message}
              onClose={() => {
                setDeleting(false);
                remove.reset();
              }}
              onConfirm={() =>
                remove.mutate(e._id, {
                  onSuccess: () => router.push("/modules/exhibitions"),
                })
              }
            >
              {rows.length > 0 ? (
                <>
                  <strong className="text-ink">
                    {fmt(rows.length)} client(s)
                  </strong>{" "}
                  are booked here. Their stalls aren&apos;t deleted, but any
                  design options for this exhibition will be removed. This
                  can&apos;t be undone.
                </>
              ) : (
                <>This can&apos;t be undone.</>
              )}
            </ConfirmDialog>
          </>
        );
      }}
    </QueryState>
  );
}
