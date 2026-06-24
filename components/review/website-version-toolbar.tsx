"use client";

/** Legacy toolbar — MVP uses SubmitVersionDialog in mvp-review-workspace. */
export function getCompareVariants(
  _versions: unknown,
  viewingVersion: number
): { prev: number; current: number } | null {
  if (viewingVersion <= 1) return null;
  return { prev: viewingVersion - 1, current: viewingVersion };
}
