"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { ChallanBrowser } from "@/components/challans/challan-browser";
import { OutgoingChallanDialog } from "./_components/outgoing-challan-dialog";

export function OutgoingView() {
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Each challan also books a trip charge for the transporter, same as in the Transport module.</p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          Add challan
        </Button>
      </div>
      <ChallanBrowser dir="outgoing" />
      <OutgoingChallanDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
