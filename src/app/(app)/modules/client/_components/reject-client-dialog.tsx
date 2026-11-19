"use client";

import { Ban } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import { rejectClient, useClientsMutation, type Client } from "@/lib/clients";

const MAX = 500;

/** Reject a lead client. A reason is required; it's shown on the client page and in the list. */
export function RejectClientDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const reject = useClientsMutation(rejectClient);
  const name = client.companyName || client.clientName;
  const valid = reason.trim().length > 0 && reason.trim().length <= MAX;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    reject.mutate({ clientId: client._id, reason: reason.trim() }, { onSuccess: onClose });
  }

  return (
    <Modal
      open
      onClose={reject.isPending ? () => {} : onClose}
      title={`Reject ${name}?`}
      description="The client stays in your list with this reason, but is left out of the deal, paid and remaining totals. You can reopen it later."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Reason" hint={`${reason.trim().length}/${MAX}`}>
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              required
              autoFocus
              maxLength={MAX}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Budget too low, booked with another organiser, not reachable after 3 calls"
            />
          )}
        </Field>
        {reject.error && <Alert>{reject.error.message}</Alert>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={reject.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={reject.isPending} disabled={!valid} className="bg-danger text-white hover:opacity-90">
            <Ban className="size-4" aria-hidden />
            Reject lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}
