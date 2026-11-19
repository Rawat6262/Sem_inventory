"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyNote, QueryState, Section } from "@/components/data-ui";
import { Alert, Button } from "@/components/ui";
import { employeeKeys, saveEmployeeAccess, useEmployeeAccess, type EmployeeAccess } from "@/lib/employees";
import { findModule, isRole, roleModules, ROLE_LABELS } from "@/lib/permissions";

// Admin only: what this person can open. Untick a module their role includes
// to take it away; tick an extra module to give it on top of the role (inside
// an extra module they see, edit and delete only records they added).
export function AccessSection({ employeeId }: { employeeId: string }) {
  const access = useEmployeeAccess(employeeId, true);

  return (
    <Section
      title="Module access"
      description="Ticked modules are the ones this person can open. Untick one to take it away, tick one to give it."
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

const sameSet = (a: string[], b: string[]) => a.slice().sort().join(",") === b.slice().sort().join(",");

function AccessForm({ employeeId, access }: { employeeId: string; access: EmployeeAccess }) {
  const qc = useQueryClient();
  const user = access.user!;
  const fromRole = access.roleModules ?? roleModules(user.role);
  const savedRemoved = access.removedModules ?? [];
  const [extra, setExtra] = useState<string[]>(access.extraModules);
  const [removed, setRemoved] = useState<string[]>(savedRemoved);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: saveEmployeeAccess,
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: employeeKeys.access(employeeId) });
    },
  });

  const roleLabel = isRole(user.role) ? ROLE_LABELS[user.role] : user.role;
  const changed = !sameSet(extra, access.extraModules) || !sameSet(removed, savedRemoved);
  const flip = (list: string[], key: string) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  if (user.role === "admin") {
    return <EmptyNote>{user.full_name} is an admin. Admins always open every module, so there&apos;s nothing to change.</EmptyNote>;
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">
        Login: <span className="font-medium text-ink">{user.full_name}</span> · {user.gmail} · {roleLabel}
      </p>

      {fromRole.length > 0 && (
        <ModuleGroup
          title={`Included with the ${roleLabel} role`}
          hint={removed.length ? `${removed.length} taken away` : "All on. Untick a module to take it away."}
          keys={fromRole}
          isChecked={(k) => !removed.includes(k)}
          onToggle={(k) => {
            setSaved(false);
            setRemoved((r) => flip(r, k));
          }}
        />
      )}

      {access.grantable.length > 0 && (
        <ModuleGroup
          title="Extra modules"
          hint="Not part of the role. In these they only see, edit and delete records they added."
          keys={access.grantable}
          isChecked={(k) => extra.includes(k)}
          onToggle={(k) => {
            setSaved(false);
            setExtra((e) => flip(e, k));
          }}
        />
      )}

      {save.error && <Alert>{save.error.message}</Alert>}
      {saved && !changed && <Alert tone="success">Access saved. {user.full_name} sees the change the next time their page loads.</Alert>}
      <div className="flex justify-end border-t border-line pt-4">
        <Button onClick={() => save.mutate({ employeeId, modules: extra, removed })} loading={save.isPending} disabled={!changed}>
          Save access
        </Button>
      </div>
    </div>
  );
}

function ModuleGroup({
  title,
  hint,
  keys,
  isChecked,
  onToggle,
}: {
  title: string;
  hint: string;
  keys: string[];
  isChecked: (key: string) => boolean;
  onToggle: (key: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{title}</legend>
      <p className="mb-2 text-xs text-muted">{hint}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => {
          const mod = findModule(key);
          const checked = isChecked(key);
          return (
            <label
              key={key}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${checked ? "border-accent bg-accent-soft/40" : "border-line hover:bg-surface-2"}`}
            >
              <input type="checkbox" className="mt-0.5 size-4 accent-accent" checked={checked} onChange={() => onToggle(key)} />
              <span>
                <span className={`block font-medium ${checked ? "" : "text-muted"}`}>{mod?.label ?? key}</span>
                {mod && <span className="block text-xs text-muted">{mod.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
