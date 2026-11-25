"use client";

import { Calendar, CheckCircle2, Mail, Pencil, Phone, Plus, SearchX, Target, TrendingUp, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/modal";
import { Paged } from "@/components/pagination";
import { Alert, Button, Select } from "@/components/ui";
import { BackLink, Count, EmptyNote, EmptyState, QueryState, Section, StatTile, TableWrap, td, th } from "@/components/data-ui";
import { useMe } from "@/hooks/use-me";
import { ApiError } from "@/lib/api";
import { mayDelete } from "@/lib/permissions";
import {
  deleteEmployee,
  fmt,
  fmtDate,
  fmtMoney,
  markSalaryPaid,
  MONTH_NAMES,
  removeLeaveDate,
  useEmployee,
  useEmployeesMutation,
  useLeaveMonth,
  useSalaryHistory,
  useYearlyReport,
} from "@/lib/employees";
import { AccessSection } from "../_components/access-section";
import { AddAchievedDialog } from "../_components/add-achieved-dialog";
import { EmployeeDialog } from "../_components/employee-dialog";
import { GenerateSalaryDialog } from "../_components/generate-salary-dialog";
import { IncrementDialog } from "../_components/increment-dialog";
import { LeaveDialog } from "../_components/leave-dialog";
import { MonthYearPicker } from "../_components/month-year-picker";
import { SalesTargetDialog } from "../_components/sales-target-dialog";

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const employee = useEmployee(id);

  const now = new Date();
  const [leaveMonth, setLeaveMonth] = useState(now.getMonth() + 1);
  const [leaveYear, setLeaveYear] = useState(now.getFullYear());
  const [salesYear, setSalesYear] = useState(now.getFullYear());

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [giving, setGiving] = useState(false);
  const [addingLeave, setAddingLeave] = useState(false);
  const [removingLeave, setRemovingLeave] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [settingTarget, setSettingTarget] = useState(false);
  const [addingAchieved, setAddingAchieved] = useState(false);

  const remove = useEmployeesMutation((eid: string) => deleteEmployee(eid));
  const markPaid = useEmployeesMutation(markSalaryPaid);
  const removeLeave = useEmployeesMutation(removeLeaveDate);
  const me = useMe().data;

  const canSeeSensitive = employee.data ? employee.data.current_salary !== undefined : false;
  const leave = useLeaveMonth(canSeeSensitive ? id : "", leaveMonth, leaveYear);
  const salary = useSalaryHistory(canSeeSensitive ? id : "");
  const sales = useYearlyReport(canSeeSensitive ? id : "", salesYear);

  if (employee.error instanceof ApiError && [400, 404].includes(employee.error.status)) {
    return (
      <EmptyState icon={<SearchX className="size-6" />} title="Employee not found" action={<BackLink href="/modules/employees">Back to employees</BackLink>}>
        They may have been deleted.
      </EmptyState>
    );
  }

  return (
    <QueryState queries={[employee]}>
      {() => {
        const e = employee.data!;

        return (
          <>
            <BackLink href="/modules/employees">← All employees</BackLink>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{e.name}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium">{e.company}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.status === "active" ? "bg-success-soft text-success" : e.status === "terminated" ? "bg-danger-soft text-danger" : "bg-surface-2"}`}>{e.status}</span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3.5" aria-hidden />
                    {e.phone}
                  </span>
                  {e.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3.5" aria-hidden />
                      {e.email}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5" aria-hidden />
                    Joined {fmtDate(e.joining_date)}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
                {me && mayDelete(me, e.createdBy) && (
                  <Button variant="secondary" className="hover:text-danger" onClick={() => setDeleting(true)}>
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                )}
                {canSeeSensitive && (
                  <Button onClick={() => setGiving(true)}>
                    <TrendingUp className="size-4" aria-hidden />
                    Give increment
                  </Button>
                )}
              </div>
            </div>

            {canSeeSensitive && (
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatTile label="Current salary" value={fmtMoney(e.current_salary)} />
                {e.account_details?.bank_name && <StatTile label="Bank" value={e.account_details.bank_name} />}
                {(e.pan_card || e.aadhaar_card || e.photo) && (
                  <StatTile
                    label="Documents"
                    value={
                      <span className="flex gap-1 text-sm font-normal">
                        {(
                          [
                            e.pan_card && { label: "PAN", url: e.pan_card },
                            e.aadhaar_card && { label: "Aadhaar", url: e.aadhaar_card },
                            e.photo && { label: "Photo", url: e.photo },
                          ].filter(Boolean) as { label: string; url: string }[]
                        ).map((doc) => (
                          <a key={doc.label} href={doc.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                            {doc.label}
                          </a>
                        ))}
                      </span>
                    }
                  />
                )}
              </div>
            )}

            {!canSeeSensitive && (
              <div className="mt-6">
                <EmptyNote>Salary, leave and sales details aren&apos;t shown for other employees.</EmptyNote>
              </div>
            )}

            {canSeeSensitive && (
              <>
                <Section
                  title="Leave"
                  action={
                    <div className="flex items-center gap-2">
                      <MonthYearPicker month={leaveMonth} year={leaveYear} onChange={(m, y) => { setLeaveMonth(m); setLeaveYear(y); }} />
                      <Button variant="secondary" className="h-10" onClick={() => setAddingLeave(true)}>
                        <Plus className="size-4" aria-hidden />
                        Add
                      </Button>
                    </div>
                  }
                >
                  <QueryState queries={[leave]}>
                    {() => {
                      const l = leave.data!;
                      return l.leave_dates.length === 0 ? (
                        <EmptyNote>No leave recorded for {MONTH_NAMES[leaveMonth - 1]} {leaveYear}.</EmptyNote>
                      ) : (
                        <div className="rounded-xl border border-line bg-surface p-4">
                          <p className="text-sm text-muted">
                            {fmt(l.leave_count)} day{l.leave_count === 1 ? "" : "s"} · {l.leave_type ?? "unpaid"}
                            {l.reason && <> · {l.reason}</>}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {l.leave_dates.map((d) => (
                              <span key={d} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 py-0.5 pr-1 pl-2 text-xs">
                                {fmtDate(d)}
                                <button
                                  type="button"
                                  onClick={() => setRemovingLeave(d)}
                                  className="rounded-full p-1 text-muted hover:bg-danger-soft hover:text-danger"
                                  aria-label={`Remove leave on ${fmtDate(d)}`}
                                >
                                  <X className="size-3" aria-hidden />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  </QueryState>
                </Section>

                <Section
                  title="Salary"
                  action={
                    <Button variant="secondary" onClick={() => setGenerating(true)}>
                      <Plus className="size-4" aria-hidden />
                      Generate for a month
                    </Button>
                  }
                >
                  {markPaid.error && (
                    <div className="mb-3">
                      <Alert>{markPaid.error.message}</Alert>
                    </div>
                  )}
                  <QueryState queries={[salary]}>
                    {() => {
                      const s = salary.data!;
                      return s.salaries.length === 0 ? (
                        <EmptyNote>No salary generated yet.</EmptyNote>
                      ) : (
                        <Paged items={s.salaries}>
                          {(pageRows) => (
                            <TableWrap>
                              <table className="w-full text-sm">
                                <thead className="border-b border-line bg-surface-2/50">
                                  <tr>
                                    <th className={th}>Month</th>
                                    <th className={`${th} text-right`}>Base</th>
                                    <th className={`${th} text-right`}>Increment</th>
                                    <th className={`${th} text-right`}>Leave deduction</th>
                                    <th className={`${th} text-right`}>Final</th>
                                    <th className={th}>Status</th>
                                    <th className={th}>
                                      <span className="sr-only">Actions</span>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                  {pageRows.map((row) => (
                                    <tr key={row._id}>
                                      <td className={`${td} font-medium`}>
                                        {MONTH_NAMES[row.month - 1]} {row.year}
                                      </td>
                                      <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.base_salary)}</td>
                                      <td className={`${td} text-right`}>
                                        <Count n={row.increment} tone="success" money />
                                      </td>
                                      <td className={`${td} text-right`}>
                                        <Count n={row.leave_deduction} tone="danger" money />
                                      </td>
                                      <td className={`${td} text-right tabular-nums font-medium`}>{fmtMoney(row.final_salary)}</td>
                                      <td className={td}>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.payment_status === "paid" ? "bg-success-soft text-success" : "bg-surface-2 text-muted"}`}>{row.payment_status}</span>
                                      </td>
                                      <td className={`${td} text-right`}>
                                        {row.payment_status === "pending" && (
                                          <Button variant="ghost" className="h-8 px-2.5 text-accent hover:bg-accent-soft" loading={markPaid.isPending} onClick={() => markPaid.mutate(row._id)}>
                                            <CheckCircle2 className="size-3.5" aria-hidden />
                                            Mark paid
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </TableWrap>
                          )}
                        </Paged>
                      );
                    }}
                  </QueryState>
                </Section>

                <Section
                  title="Sales targets"
                  action={
                    <div className="flex items-center gap-2">
                      <Select aria-label="Year" value={salesYear} onChange={(e) => setSalesYear(Number(e.target.value))} className="w-24">
                        {Array.from({ length: 5 }, (_, i) => now.getFullYear() + 1 - 3 + i).map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </Select>
                      <Button variant="secondary" className="h-10" onClick={() => setSettingTarget(true)}>
                        <Target className="size-4" aria-hidden />
                        Add target
                      </Button>
                      <Button variant="secondary" className="h-10" onClick={() => setAddingAchieved(true)}>
                        <Plus className="size-4" aria-hidden />
                        Add achieved
                      </Button>
                    </div>
                  }
                >
                  {sales.error instanceof ApiError && sales.error.status === 404 ? (
                    <EmptyNote>No sales targets set for {salesYear} yet.</EmptyNote>
                  ) : (
                    <QueryState queries={[sales]}>
                      {() => {
                        const r = sales.data!;
                        return (
                          <>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                              <StatTile label="Target" value={fmtMoney(r.yearlySummary.totalTarget)} />
                              <StatTile label="Achieved" value={fmtMoney(r.yearlySummary.totalAchieved)} tone="success" />
                              <StatTile label="Remaining" value={fmtMoney(r.yearlySummary.totalRemaining)} tone={r.yearlySummary.totalRemaining > 0 ? "warn" : undefined} />
                              <StatTile label="Grade" value={r.yearlySummary.overallGrade} />
                            </div>
                            <div className="mt-4">
                              <TableWrap>
                                <table className="w-full text-sm">
                                  <thead className="border-b border-line bg-surface-2/50">
                                    <tr>
                                      <th className={th}>Month</th>
                                      <th className={`${th} text-right`}>Target</th>
                                      <th className={`${th} text-right`}>Achieved</th>
                                      <th className={`${th} text-right`}>Completion</th>
                                      <th className={th}>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-line">
                                    {r.monthlyBreakdown.map((m) => (
                                      <tr key={m.month}>
                                        <td className={`${td} font-medium`}>{m.monthName}</td>
                                        <td className={`${td} text-right tabular-nums`}>{fmtMoney(m.target)}</td>
                                        <td className={`${td} text-right tabular-nums`}>{fmtMoney(m.achieved)}</td>
                                        <td className={`${td} text-right tabular-nums`}>{m.completionPercent}</td>
                                        <td className={`${td} text-muted`}>{m.performanceStatus}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </TableWrap>
                            </div>
                          </>
                        );
                      }}
                    </QueryState>
                  )}
                </Section>
              </>
            )}

            {me?.role === "admin" && <AccessSection employeeId={e._id} />}

            <EmployeeDialog open={editing} employee={editing ? e : null} onClose={() => setEditing(false)} />
            <ConfirmDialog
              open={deleting}
              title={`Delete ${e.name}?`}
              confirmLabel="Delete employee"
              pending={remove.isPending}
              error={remove.error?.message}
              onClose={() => {
                setDeleting(false);
                remove.reset();
              }}
              onConfirm={() => remove.mutate(e._id, { onSuccess: () => router.push("/modules/employees") })}
            >
              This also deletes their leave, unpaid salary and sales report history. Their login keeps working: to stop it, set their status to terminated
              instead. This can&apos;t be undone.
            </ConfirmDialog>
            <ConfirmDialog
              open={Boolean(removingLeave)}
              title={`Remove leave on ${fmtDate(removingLeave)}?`}
              confirmLabel="Remove leave"
              pending={removeLeave.isPending}
              error={removeLeave.error?.message}
              onClose={() => {
                setRemovingLeave(null);
                removeLeave.reset();
              }}
              onConfirm={() => removingLeave && removeLeave.mutate({ employeeId: e._id, day: removingLeave.slice(0, 10) }, { onSuccess: () => setRemovingLeave(null) })}
            >
              If that month&apos;s salary was generated but not paid, it&apos;s worked out again without this day. A paid salary doesn&apos;t change.
            </ConfirmDialog>
            {giving && <IncrementDialog open onClose={() => setGiving(false)} employee={e} />}
            {addingLeave && <LeaveDialog open onClose={() => setAddingLeave(false)} employeeId={e._id} month={leaveMonth} year={leaveYear} />}
            {generating && <GenerateSalaryDialog open onClose={() => setGenerating(false)} employee={e} />}
            {settingTarget && <SalesTargetDialog open onClose={() => setSettingTarget(false)} employee={e} />}
            {addingAchieved && <AddAchievedDialog open onClose={() => setAddingAchieved(false)} employee={e} />}
          </>
        );
      }}
    </QueryState>
  );
}
