"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { ChallanBrowser } from "@/components/challans/challan-browser";
import { IncomingChallanDialog } from "./_components/incoming-challan-dialog";

export function IncomingView() {
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Only what&apos;s still pending for a warehouse and exhibition can be returned here.</p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          Add challan
        </Button>
      </div>
      <ChallanBrowser dir="incoming" />
      <IncomingChallanDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
