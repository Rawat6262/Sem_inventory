"use client";

import { useMe } from "@/hooks/use-me";
import { mayDelete } from "@/lib/permissions";
import { ChevronRight, Phone, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button } from "@/components/ui";
import { EmptyState, QueryState, SearchBox, TableWrap, td, th } from "@/components/data-ui";
import { deletePerson, useManpowerMutation, usePersons, type Person } from "@/lib/manpower";
import { PersonDialog } from "./_components/person-dialog";

export function ManpowerView() {
  const persons = usePersons();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Person | null | "new">(null);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const remove = useManpowerMutation((id: string) => deletePerson(id));
  const me = useMe().data;

  const q = search.trim().toLowerCase();
  const list = (persons.data ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone?.includes(q));

  return (
    <QueryState queries={[persons]}>
      {() => (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name or phone" />
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Add worker
            </Button>
          </div>

          {persons.data?.length === 0 ? (
            <EmptyState icon={<Users className="size-6" />} title="No workers yet" action={<Button onClick={() => setEditing("new")}>Add the first worker</Button>}>
              Add a sub-labour worker, then record their day-wage or tender work at an exhibition.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No workers match &ldquo;{search}&rdquo;.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Phone</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((p) => (
                    <tr key={p._id} className="hover:bg-surface-2/40">
                      <td className={td}>
                        <Link href={`/modules/manpower/${p._id}`} className="font-medium hover:text-accent hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className={td}>
                        {p.phone ? (
                          <span className="inline-flex items-center gap-1 text-muted">
                            <Phone className="size-3.5" aria-hidden />
                            {p.phone}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/modules/manpower/${p._id}`}
                            className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                          >
                            View
                            <ChevronRight className="size-3.5" aria-hidden />
                          </Link>
                          <Button variant="ghost" className="h-8 px-2.5" onClick={() => setEditing(p)}>
                            Edit
                          </Button>
                          {me && mayDelete(me, p.createdBy) && (
                            <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}>
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

          <PersonDialog open={editing !== null} person={editing === "new" ? null : editing} onClose={() => setEditing(null)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.name ?? ""}?`}
            confirmLabel="Delete worker"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            Their recorded work payments stay on file, but will no longer show up grouped under their name. This can&apos;t be undone.
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
