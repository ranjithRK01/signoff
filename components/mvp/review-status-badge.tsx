import { Badge } from "@/components/ui/badge";
import type { ReviewItemStatus, ReviewSessionStatus } from "@/lib/types";
import { statusLabel, reviewStatusLabel } from "@/lib/workflow";

const sessionStyles: Record<ReviewSessionStatus, string> = {
  IN_REVIEW: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  CHANGES_REQUESTED: "bg-rose-100 text-rose-900 hover:bg-rose-100",
  APPROVED: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
};

const itemStyles: Record<ReviewItemStatus, string> = {
  REQUESTED: "bg-zinc-100 text-zinc-800 hover:bg-zinc-100",
  WORKING: "bg-blue-100 text-blue-900 hover:bg-blue-100",
  READY_FOR_REVIEW: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  APPROVED: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  NEEDS_MORE_WORK: "bg-rose-100 text-rose-900 hover:bg-rose-100",
};

export function ReviewSessionStatusBadge({
  status,
  className,
}: {
  status: ReviewSessionStatus;
  className?: string;
}) {
  return (
    <Badge
      className={`border-none rounded-md px-2.5 py-0.5 text-xs font-semibold ${sessionStyles[status]} ${className ?? ""}`}
    >
      {reviewStatusLabel(status)}
    </Badge>
  );
}

export function ReviewItemStatusBadge({
  status,
  className,
}: {
  status: ReviewItemStatus;
  className?: string;
}) {
  return (
    <Badge
      className={`border-none rounded-md px-2 py-0.5 text-[10px] font-semibold ${itemStyles[status]} ${className ?? ""}`}
    >
      {statusLabel(status)}
    </Badge>
  );
}
