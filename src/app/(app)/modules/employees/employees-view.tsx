"use client";

import { ChevronRight, Contact, Phone, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Button, Select } from "@/components/ui";
import { EmptyState, QueryState, SearchBox, TableWrap, td, th } from "@/components/data-ui";
import { deleteEmployee, EMPLOYEE_STATUSES, fmtMoney, useEmployees, useEmployeesMutation, type Employee } from "@/lib/employees";
import { EmployeeDialog } from "./_components/employee-dialog";

export function EmployeesView() {
  const employees = useEmployees();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Employee | null | "new">(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const remove = useEmployeesMutation((id: string) => deleteEmployee(id));

  const q = search.trim().toLowerCase();
  const list = (employees.data ?? []).filter(
    (e) => (!q || e.name.toLowerCase().includes(q) || e.phone?.includes(q) || e.company?.toLowerCase().includes(q)) && (!status || e.status === status),
  );
  const canSeeSalary = employees.data?.some((e) => e.current_salary !== undefined) ?? false;

  return (
    <QueryState queries={[employees]}>
      {() => (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBox value={search} onChange={setSearch} placeholder="Search by name, phone or company" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="sm:w-40">
                <option value="">All statuses</option>
                {EMPLOYEE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden />
              Add employee
            </Button>
          </div>

          {employees.data?.length === 0 ? (
            <EmptyState icon={<Contact className="size-6" />} title="No employees yet" action={<Button onClick={() => setEditing("new")}>Add the first employee</Button>}>
              Only active employees are listed here.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No employees match these filters.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Company</th>
                    <th className={th}>Phone</th>
                    <th className={th}>Status</th>
                    {canSeeSalary && <th className={`${th} text-right`}>Current salary</th>}
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((e) => (
                    <tr key={e._id} className="hover:bg-surface-2/40">
                      <td className={td}>
                        <Link href={`/modules/employees/${e._id}`} className="font-medium hover:text-accent hover:underline">
                          {e.name}
                        </Link>
                      </td>
                      <td className={`${td} text-muted`}>{e.company}</td>
                      <td className={td}>
                        <span className="inline-flex items-center gap-1 text-muted">
                          <Phone className="size-3.5" aria-hidden />
                          {e.phone}
                        </span>
                      </td>
                      <td className={td}>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.status === "active" ? "bg-success-soft text-success" : e.status === "terminated" ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>
                          {e.status}
                        </span>
                      </td>
                      {canSeeSalary && <td className={`${td} text-right tabular-nums`}>{e.current_salary !== undefined ? fmtMoney(e.current_salary) : <span className="text-muted">—</span>}</td>}
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/modules/employees/${e._id}`}
                            className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                          >
                            View
                            <ChevronRight className="size-3.5" aria-hidden />
                          </Link>
                          <Button variant="ghost" className="h-8 px-2.5" onClick={() => setEditing(e)}>
                            Edit
                          </Button>
                          <Button variant="ghost" className="h-8 px-2.5 hover:text-danger" onClick={() => setDeleting(e)} aria-label={`Delete ${e.name}`}>
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

          <EmployeeDialog open={editing !== null} employee={editing === "new" ? null : editing} onClose={() => setEditing(null)} />

          <ConfirmDialog
            open={Boolean(deleting)}
            title={`Delete ${deleting?.name ?? ""}?`}
            confirmLabel="Delete employee"
            pending={remove.isPending}
            error={remove.error?.message}
            onClose={() => {
              setDeleting(null);
              remove.reset();
            }}
            onConfirm={() => deleting && remove.mutate(deleting._id, { onSuccess: () => setDeleting(null) })}
          >
            This also deletes their leave, salary and sales report history. This can&apos;t be undone.
          </ConfirmDialog>
        </>
      )}
    </QueryState>
  );
}
