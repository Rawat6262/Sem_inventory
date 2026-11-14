"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Select } from "@/components/ui";
import { addExhibitionToContractor, useContractorsMutation, useExhibitionsList, type LabourExhibitionEntry } from "@/lib/contractors";

type Props = { open: boolean; onClose: () => void; labourId: string; already: LabourExhibitionEntry[] };

export function AddExhibitionDialog({ open, onClose, labourId, already }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Book for an exhibition">
      {open && <AddExhibitionForm labourId={labourId} already={already} onDone={onClose} />}
    </Modal>
  );
}

function AddExhibitionForm({ labourId, already, onDone }: { labourId: string; already: LabourExhibitionEntry[]; onDone: () => void }) {
  const exhibitions = useExhibitionsList();
  const [exhibitionId, setExhibitionId] = useState("");
  const add = useContractorsMutation(addExhibitionToContractor);

  const alreadyIds = new Set(already.map((e) => (typeof e.exhibition === "object" ? e.exhibition._id : e.exhibition)));
  const available = (exhibitions.data ?? []).filter((e) => !alreadyIds.has(e._id));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!exhibitionId) return;
    add.mutate({ labourId, exhibitionId }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Exhibition" hint={exhibitions.data && available.length === 0 ? "Already booked for every exhibition." : undefined}>
        {(id) => (
          <Select id={id} required value={exhibitionId} onChange={(e) => setExhibitionId(e.target.value)} disabled={exhibitions.isPending}>
            <option value="">{exhibitions.isPending ? "Loading…" : "Select exhibition"}</option>
            {available.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.name}
                {ex.city ? ` — ${ex.city}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {add.error && <Alert>{add.error.message}</Alert>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onDone} disabled={add.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={add.isPending} disabled={!exhibitionId}>
          Add
        </Button>
      </div>
    </form>
  );
}
