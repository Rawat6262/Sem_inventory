"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useContractor, useContractors, useExhibitionsList, type DealPurpose } from "@/lib/contractors";
import { useSupervisors } from "@/lib/supervisors";
import {
  CATEGORY_LABELS,
  createTransaction,
  fmtMoney,
  PAYMENT_MODES,
  PURPOSES,
  TRANSACTION_CATEGORIES,
  updateTransaction,
  useTransactionsMutation,
  type EditTransactionInput,
  type NewTransactionInput,
  type PaymentMode,
  type Transaction,
  type TransactionCategory,
} from "@/lib/transactions";
import { useTransporters } from "@/lib/transport";
import { useVendors } from "@/lib/vendors";

type Props = { open: boolean; onClose: () => void; transaction?: Transaction | null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionDialog({ open, onClose, transaction }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={transaction ? "Edit transaction" : "Add transaction"} description={transaction ? undefined : "Records what's owed. Pay it separately once it's settled."}>
      {open && <TransactionForm key={transaction?._id ?? "new"} transaction={transaction} onDone={onClose} />}
    </Modal>
  );
}

function entityIdOf(t: Transaction): string {
  switch (t.category) {
    case "labour":
      return t.labour?._id ?? "";
    case "transporter":
      return t.transporter?._id ?? "";
    case "supervisor":
      return t.supervisor?._id ?? "";
    case "vendor":
      return t.vendor?._id ?? "";
  }
}

function TransactionForm({ transaction, onDone }: { transaction?: Transaction | null; onDone: () => void }) {
  const exhibitions = useExhibitionsList();
  const [category, setCategory] = useState<TransactionCategory>(transaction?.category ?? "labour");
  const [exhibitionId, setExhibitionId] = useState(transaction?.exhibition?._id ?? "");
  const [entityId, setEntityId] = useState(transaction ? entityIdOf(transaction) : "");
  const [stallId, setStallId] = useState(transaction?.stall ?? "");
  const [rows, setRows] = useState<DealPurpose[]>(transaction?.purposes ?? [{ purpose: "other", amount: 0 }]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>((transaction?.payment_mode as PaymentMode) ?? "cash");
  const [vehicleNumber, setVehicleNumber] = useState(transaction?.vehicle_number ?? "");
  const [remark, setRemark] = useState(transaction?.remark ?? "");
  const [date, setDate] = useState(transaction ? transaction.transaction_date.slice(0, 10) : today());

  const create = useTransactionsMutation((input: NewTransactionInput) => createTransaction(input));
  const update = useTransactionsMutation((input: EditTransactionInput) => updateTransaction(input));
  const saving = transaction ? update : create;

  const total = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const purposeNames = rows.map((r) => r.purpose.trim().toLowerCase());
  const hasDuplicate = new Set(purposeNames).size !== purposeNames.length;
  const rowsValid = rows.every((r) => r.purpose.trim() && Number(r.amount) > 0) && !hasDuplicate;
  const alreadyPaid = transaction?.paid_amount ?? 0;
  const belowPaid = Boolean(transaction) && total < alreadyPaid;
  const valid = transaction
    ? rowsValid && remark.trim() && !belowPaid
    : Boolean(exhibitionId) && Boolean(entityId) && rowsValid && remark.trim();

  function updateRow(i: number, patch: Partial<DealPurpose>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const purposes = rows.map((r) => ({ purpose: r.purpose.trim(), amount: Number(r.amount) }));
    if (transaction) {
      update.mutate(
        { id: transaction._id, purposes, payment_mode: paymentMode, remark: remark.trim(), transaction_date: date, vehicle_number: vehicleNumber.trim() || undefined },
        { onSuccess: onDone },
      );
    } else {
      create.mutate(
        {
          exhibition: exhibitionId,
          category,
          purposes,
          payment_mode: paymentMode,
          remark: remark.trim(),
          transaction_date: date,
          vehicle_number: category === "transporter" ? vehicleNumber.trim() || undefined : undefined,
          ...(category === "labour" ? { labour: entityId, stall: stallId || undefined } : {}),
          ...(category === "transporter" ? { transporter: entityId } : {}),
          ...(category === "supervisor" ? { supervisor: entityId } : {}),
          ...(category === "vendor" ? { vendor: entityId } : {}),
        },
        { onSuccess: onDone },
      );
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {transaction ? (
        <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm text-muted">
          {CATEGORY_LABELS[transaction.category]} · {transaction.exhibition_name ?? transaction.exhibition?.name} — who and which exhibition can&apos;t be
          changed here.
        </div>
      ) : (
        <>
          <Field label="Category">
            {(id) => (
              <Select
                id={id}
                required
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as TransactionCategory);
                  setEntityId("");
                  setStallId("");
                }}
              >
                {TRANSACTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Exhibition">
            {(id) => (
              <Select id={id} required value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} disabled={exhibitions.isPending}>
                <option value="">{exhibitions.isPending ? "Loading…" : "Select exhibition"}</option>
                {exhibitions.data?.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                    {ex.city ? ` — ${ex.city}` : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <EntityPicker category={category} value={entityId} onChange={setEntityId} />

          {category === "labour" && entityId && exhibitionId && (
            <StallPicker labourId={entityId} exhibitionId={exhibitionId} value={stallId} onChange={setStallId} />
          )}
          {category === "transporter" && (
            <Field label="Vehicle number (optional)">{(id) => <Input id={id} value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="e.g. DL 1AB 2345" />}</Field>
          )}
        </>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field label={i === 0 ? "Purpose" : ""} className="flex-1">
              {(id) => (
                <Select id={id} required value={PURPOSES.includes(row.purpose as (typeof PURPOSES)[number]) ? row.purpose : ""} onChange={(e) => updateRow(i, { purpose: e.target.value })}>
                  {!PURPOSES.includes(row.purpose as (typeof PURPOSES)[number]) && <option value="">Select purpose</option>}
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={i === 0 ? "Amount" : ""} className="w-32">
              {(id) => <Input id={id} type="number" inputMode="numeric" required min={1} value={row.amount || ""} onChange={(e) => updateRow(i, { amount: Number(e.target.value) })} />}
            </Field>
            {rows.length > 1 && (
              <Button type="button" variant="ghost" className="mb-0.5 h-10 px-2 text-danger" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))} aria-label="Remove row">
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" className="self-start" onClick={() => setRows((r) => [...r, { purpose: "other", amount: 0 }])}>
          <Plus className="size-4" aria-hidden />
          Add another purpose
        </Button>
      </div>
      {hasDuplicate && <p className="text-sm text-danger">Each purpose can only appear once.</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Payment mode">
          {(id) => (
            <Select id={id} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Date">{(id) => <Input id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
      </div>

      {transaction && transaction.category === "transporter" && (
        <Field label="Vehicle number (optional)">{(id) => <Input id={id} value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />}</Field>
      )}

      <Field label="Remark">{(id) => <Textarea id={id} required rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="What is this for?" />}</Field>

      <div className="rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
        Total: <span className="font-semibold tabular-nums">{fmtMoney(total)}</span>
        {alreadyPaid > 0 && <span className="text-muted"> · already paid {fmtMoney(alreadyPaid)}</span>}
      </div>

      {belowPaid && <Alert>The total can&apos;t be less than what&apos;s already been paid ({fmtMoney(alreadyPaid)}).</Alert>}
      {saving.error && <Alert>{saving.error.message}</Alert>}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={saving.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={saving.isPending} disabled={!valid}>
          {transaction ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}

function EntityPicker({ category, value, onChange }: { category: TransactionCategory; value: string; onChange: (v: string) => void }) {
  const contractors = useContractors();
  const transporters = useTransporters();
  const supervisors = useSupervisors();
  const vendors = useVendors();

  if (category === "labour") {
    return (
      <Field label="Contractor">
        {(id) => (
          <Select id={id} required value={value} onChange={(e) => onChange(e.target.value)} disabled={contractors.isPending}>
            <option value="">{contractors.isPending ? "Loading…" : "Select contractor"}</option>
            {contractors.data?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    );
  }
  if (category === "transporter") {
    return (
      <Field label="Transporter">
        {(id) => (
          <Select id={id} required value={value} onChange={(e) => onChange(e.target.value)} disabled={transporters.isPending}>
            <option value="">{transporters.isPending ? "Loading…" : "Select transporter"}</option>
            {transporters.data?.map((t) => (
              <option key={t._id} value={t._id}>
                {t.transporter_name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    );
  }
  if (category === "supervisor") {
    return (
      <Field label="Supervisor">
        {(id) => (
          <Select id={id} required value={value} onChange={(e) => onChange(e.target.value)} disabled={supervisors.isPending}>
            <option value="">{supervisors.isPending ? "Loading…" : "Select supervisor"}</option>
            {supervisors.data?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.full_name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    );
  }
  return (
    <Field label="Vendor">
      {(id) => (
        <Select id={id} required value={value} onChange={(e) => onChange(e.target.value)} disabled={vendors.isPending}>
          <option value="">{vendors.isPending ? "Loading…" : "Select vendor"}</option>
          {vendors.data?.map((v) => (
            <option key={v._id} value={v._id}>
              {v.vendorName}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

function StallPicker({ labourId, exhibitionId, value, onChange }: { labourId: string; exhibitionId: string; value: string; onChange: (v: string) => void }) {
  const contractor = useContractor(labourId);
  const entry = contractor.data?.exhibition.find((e) => (typeof e.exhibition === "object" ? e.exhibition._id : e.exhibition) === exhibitionId);
  const stalls = entry?.stalls.filter((s) => s.remaining_amount > 0) ?? [];

  return (
    <Field
      label="Stall (optional)"
      hint={
        contractor.isPending
          ? "Loading…"
          : !entry
            ? "This contractor isn't booked for this exhibition — leave blank, or add them to it first."
            : stalls.length === 0
              ? "Nothing left owing on any stall here."
              : "Links this payment to a specific stall's balance."
      }
    >
      {(id) => (
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={contractor.isPending || stalls.length === 0}>
          <option value="">No stall</option>
          {stalls.map((s) => (
            <option key={s._id} value={s._id}>
              {s.stall_name || s.stall_no || "Stall"} — {fmtMoney(s.remaining_amount)} left
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
