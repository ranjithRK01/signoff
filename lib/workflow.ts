import type { ReviewDashboardStats, ReviewItem, ReviewItemStatus } from "@/lib/types";

export function computeDashboardStats(items: ReviewItem[]): ReviewDashboardStats {
  const total = items.length;
  const approved = items.filter((i) => i.status === "APPROVED").length;
  const awaitingValidation = items.filter((i) => i.status === "READY_FOR_REVIEW").length;
  const needsMoreWork = items.filter((i) => i.status === "NEEDS_MORE_WORK").length;
  const open = items.filter((i) =>
    ["REQUESTED", "WORKING"].includes(i.status)
  ).length;

  const readinessPercent =
    total === 0 ? 0 : Math.round((approved / total) * 100);

  return {
    total,
    approved,
    awaitingValidation,
    open,
    needsMoreWork,
    readinessPercent,
  };
}

export function canApproveRelease(items: ReviewItem[]): boolean {
  return items.length > 0 && items.every((i) => i.status === "APPROVED");
}

export function statusLabel(status: ReviewItemStatus): string {
  const map: Record<ReviewItemStatus, string> = {
    REQUESTED: "Requested",
    WORKING: "Working",
    READY_FOR_REVIEW: "Ready for review",
    APPROVED: "Approved",
    NEEDS_MORE_WORK: "Needs more work",
  };
  return map[status];
}

export function reviewStatusLabel(status: string): string {
  const map: Record<string, string> = {
    IN_REVIEW: "In review",
    CHANGES_REQUESTED: "Changes requested",
    APPROVED: "Approved",
  };
  return map[status] ?? status;
}
