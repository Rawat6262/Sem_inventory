"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyNote, QueryState, Section } from "@/components/data-ui";
import { Alert, Button } from "@/components/ui";
import { employeeKeys, saveEmployeeAccess, useEmployeeAccess, type EmployeeAccess } from "@/lib/employees";
import { findModule, isRole, ROLE_LABELS } from "@/lib/permissions";

// Admin only: give this person modules their role doesn't open on its own.
// Inside a granted module they see, edit and delete only records they added.
export function AccessSection({ employeeId }: { employeeId: string }) {
  const access = useEmployeeAccess(employeeId, true);

  return (
    <Section
      title="Extra module access"
      description="Give access to modules this person's role doesn't include. In those modules they only see, edit and delete records they added themselves."
    >
      <QueryState queries={[access]}>
        {() => (access.data!.user ? <AccessForm employeeId={employeeId} access={access.data!} /> : <NoLogin />)}
      </QueryState>
    </Section>
  );
}

function NoLogin() {
  return <EmptyNote>This employee has no login account (no user signed up with this email or phone), so there&apos;s nobody to give access to.</EmptyNote>;
}

function AccessForm({ employeeId, access }: { employeeId: string; access: EmployeeAccess }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>(access.extraModules);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: saveEmployeeAccess,
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: employeeKeys.access(employeeId) });
    },
  });

  const user = access.user!;
  const roleLabel = isRole(user.role) ? ROLE_LABELS[user.role] : user.role;
  const changed = selected.slice().sort().join(",") !== access.extraModules.slice().sort().join(",");

  function toggle(key: string) {
    setSaved(false);
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  if (access.grantable.length === 0) {
    return <EmptyNote>{user.full_name}&apos;s role ({roleLabel}) already opens every module that can be granted.</EmptyNote>;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">
        Login: <span className="font-medium text-ink">{user.full_name}</span> · {user.gmail} · {roleLabel}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {access.grantable.map((key) => {
          const mod = findModule(key);
          const checked = selected.includes(key);
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${checked ? "border-accent bg-accent-soft/40" : "border-line hover:bg-surface-2"}`}
            >
              <input type="checkbox" className="mt-0.5 size-4 accent-accent" checked={checked} onChange={() => toggle(key)} />
              <span>
                <span className="block font-medium">{mod?.label ?? key}</span>
                {mod && <span className="block text-xs text-muted">{mod.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {save.error && <Alert>{save.error.message}</Alert>}
      {saved && !changed && <Alert tone="success">Access saved. {user.full_name} sees the change the next time their page loads.</Alert>}
      <div className="flex justify-end border-t border-line pt-4">
        <Button onClick={() => save.mutate({ employeeId, modules: selected })} loading={save.isPending} disabled={!changed}>
          Save access
        </Button>
      </div>
    </div>
  );
}
