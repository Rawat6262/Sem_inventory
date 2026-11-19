import { cn } from "@/components/ui";
import { DEAL_STATUS_HINTS, DEAL_STATUS_LABELS, type DealStatus } from "@/lib/clients";

const TONE: Record<DealStatus, string> = {
  lead: "bg-surface-2 text-muted",
  final: "bg-warn-soft text-warn",
  fully_paid: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};

export function DealStatusBadge({ status, className }: { status: DealStatus; className?: string }) {
  return (
    <span
      title={DEAL_STATUS_HINTS[status]}
      className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONE[status], className)}
    >
      {DEAL_STATUS_LABELS[status]}
    </span>
  );
}
