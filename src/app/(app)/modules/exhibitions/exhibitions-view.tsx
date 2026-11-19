"use client";

import { ChevronRight, MapPin, Plus, Tent, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import {
  EmptyState,
  QueryState,
  SearchBox,
  StatTile,
  TableWrap,
  td,
  th,
} from "@/components/data-ui";
import { useMe } from "@/hooks/use-me";
import { canManageExhibitions, canOpen, mayDelete, ownsRecordsOnly } from "@/lib/permissions";
import {
  dateRange,
  deleteExhibition,
  fmt,
  useExhibitions,
  useExhibitionsMutation,
  type Exhibition,
} from "@/lib/exhibitions";
import { ExhibitionDialog } from "./_components/exhibition-dialog";

export function ExhibitionsView() {
  const exhibitions = useExhibitions();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Exhibition | null | "new">(null);
  const [deleting, setDeleting] = useState<Exhibition | null>(null);
  const remove = useExhibitionsMutation((id: string) => deleteExhibition(id));
  const me = useMe().data;
  const manage = Boolean(me && canManageExhibitions(me.role));
  const showClients = Boolean(me && canOpen(me.role, "client", me.extraModules, me.removedModules));
  const [now] = useState(() => Date.now());

  const counts = useMemo(() => {
    const list = exhibitions.data ?? [];
    return {
      total: list.length,
      upcoming: list.filter((e) => new Date(e.startDate).getTime() > now)
        .length,
      ongoing: list.filter(
        (e) =>
          new Date(e.startDate).getTime() <= now &&
          new Date(e.endDate).getTime() >= now,
      ).length,
    };
  }, [exhibitions.data, now]);

  const q = search.trim().toLowerCase();
  const list = (exhibitions.data ?? []).filter(
    (e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.venue?.toLowerCase().includes(q) ||
      e.city?.toLowerCase().includes(q) ||
      e.organiser?.toLowerCase().includes(q),
  );

  return (
    <QueryState queries={[exhibitions]}>
      {() => (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="Exhibitions" value={fmt(counts.total)} />
            <StatTile
              label="Upcoming"
              value={fmt(counts.upcoming)}
              tone="accent"
            />
            <StatTile
              label="Ongoing"
              value={fmt(counts.ongoing)}
              tone="success"
            />
          </div>

          <div className="mt-8 mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search by name, venue, city or organiser"
            />
            {manage && (
              <Button onClick={() => setEditing("new")}>
                <Plus className="size-4" aria-hidden />
                Add exhibition
              </Button>
            )}
          </div>

          {exhibitions.data?.length === 0 ? (
            <EmptyState
              icon={<Tent className="size-6" />}
              title="No exhibitions yet"
              action={
                manage ? (
                  <Button onClick={() => setEditing("new")}>
                    Add the first exhibition
                  </Button>
                ) : undefined
              }
            >
              Add an exhibition, then book clients and contractors into it.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No exhibitions match this search.
            </p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Venue</th>
                    <th className={th}>City</th>
                    <th className={th}>Dates</th>
                    {showClients && (
                      <th className={`${th} text-right`}>{me && ownsRecordsOnly(me.role) ? "Your clients" : "Clients"}</th>
                    )}
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((e) => (
                    <tr key={e._id} className="hover:bg-surface-2/40">
                      <td className={td}>
                        <Link
                          href={`/modules/exhibitions/${e._id}`}
                          className="font-medium hover:text-accent hover:underline"
                        >
                          {e.name}
                        </Link>
                      </td>
                      <td className={`${td} text-muted`}>{e.venue}</td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <MapPin className="size-3.5" aria-hidden />
                          {e.city}
                        </span>
                      </td>
                      <td className={`${td} text-muted`}>{dateRange(e)}</td>
                      {showClients && (
                        <td className={`${td} text-right tabular-nums`}>
                          {fmt(e.client?.length ?? 0)}
                        </td>
                      )}
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/modules/exhibitions/${e._id}`}
                            className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                          >
                            View
                            <ChevronRight className="size-3.5" aria-hidden />
                          </Link>
                          {me && manage && mayDelete(me, e.createdBy) && (
                            <Button
                              variant="ghost"
                              className="h-8 px-2.5 hover:text-danger"
                              onClick={() => setDeleting(e)}
                              aria-label={`Delete ${e.name}`}
                            >
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

          <ExhibitionDialog
            open={editing !== null}
            exhibition={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.name ?? ""}?`}
            confirmLabel="Delete exhibition"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() =>
              deleting &&
              remove.mutate(deleting._id, {
                onSuccess: () => setDeleting(null),
              })
            }
          >
            {deleting && (deleting.client?.length ?? 0) > 0 ? (
              <>
                This exhibition has{" "}
                <strong className="text-ink">
                  {fmt(deleting.client?.length)} client(s)
                </strong>{" "}
                linked. Their stalls and designs aren&apos;t deleted, but will
                no longer show this exhibition&apos;s details. This can&apos;t
                be undone.
              </>
            ) : (
              <>This can&apos;t be undone.</>
            )}
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
