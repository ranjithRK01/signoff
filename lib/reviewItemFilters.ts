import type { ReviewItem } from "@/lib/types";

/** Issues and canvas markers belong to the version they were created on. */
export function getItemsForViewingVersion(
  items: ReviewItem[],
  viewingVersion: number
): ReviewItem[] {
  return items.filter((item) => item.createdInVersion === viewingVersion);
}

export function canAnnotateVersion(
  viewingVersion: number,
  currentVersion: number
): boolean {
  return viewingVersion === currentVersion;
}
