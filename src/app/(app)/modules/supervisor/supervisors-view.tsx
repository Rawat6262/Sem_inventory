"use client";

import { ChevronRight, Mail, Phone, UserCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, QueryState, SearchBox, TableWrap, td, th } from "@/components/data-ui";
import { fmtMoney, supervisorPaidTotal, useSupervisors } from "@/lib/supervisors";

export function SupervisorsView() {
  const supervisors = useSupervisors();
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const list = useMemo(
    () =>
      (supervisors.data ?? []).filter(
        (s) => !q || s.full_name.toLowerCase().includes(q) || s.gmail?.toLowerCase().includes(q) || String(s.mobile_number).includes(q),
      ),
    [supervisors.data, q],
  );

  return (
    <QueryState queries={[supervisors]}>
      {() => (
        <>
          <p className="mb-4 text-sm text-muted">
            Supervisors are added through sign-up and approved by an admin. This page tracks what they&apos;re booked for and what they&apos;ve
            been paid.
          </p>

          <div className="mb-3 flex items-center justify-between gap-2">
            <SearchBox value={search} onChange={setSearch} placeholder="Search by name, email or phone" />
          </div>

          {supervisors.data?.length === 0 ? (
            <EmptyState icon={<UserCheck className="size-6" />} title="No supervisors yet">
              Ask an admin to approve a sign-up with the supervisor role.
            </EmptyState>
          ) : list.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No supervisors match &ldquo;{search}&rdquo;.</p>
          ) : (
            <TableWrap>
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-2/50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Contact</th>
                    <th className={`${th} text-right`}>Exhibitions</th>
                    <th className={`${th} text-right`}>Paid</th>
                    <th className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((s) => (
                    <tr key={s._id} className="hover:bg-surface-2/40">
                      <td className={td}>
                        <Link href={`/modules/supervisor/${s._id}`} className="font-medium hover:text-accent hover:underline">
                          {s.full_name}
                        </Link>
                        {!s.isapproved && <div className="text-xs text-warn">Not yet approved</div>}
                      </td>
                      <td className={td}>
                        <div className="flex flex-col gap-0.5 text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="size-3.5" aria-hidden />
                            {s.gmail}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="size-3.5" aria-hidden />
                            {s.mobile_number}
                          </span>
                        </div>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{s.exhibition?.length ?? 0}</td>
                      <td className={`${td} text-right tabular-nums text-success`}>{fmtMoney(supervisorPaidTotal(s))}</td>
                      <td className={`${td} text-right`}>
                        <Link
                          href={`/modules/supervisor/${s._id}`}
                          className="inline-flex h-8 items-center gap-0.5 rounded-md px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
                        >
                          View
                          <ChevronRight className="size-3.5" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}
    </QueryState>
  );
}
