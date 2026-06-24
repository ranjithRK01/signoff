import type { ReviewSession, Version } from "@/lib/types";

export function getVersionByNumber(
  versions: Version[],
  versionNumber: number
): Version | undefined {
  return versions.find((v) => v.versionNumber === versionNumber);
}

export function getCurrentVersionNumber(
  review: ReviewSession,
  versions: Version[]
): number {
  const current = versions.find((v) => v.id === review.currentVersionId);
  return current?.versionNumber ?? versions[versions.length - 1]?.versionNumber ?? 1;
}

export function getWebsiteReviewUrl(versions: Version[], versionNumber: number): string {
  return getVersionByNumber(versions, versionNumber)?.liveUrl ?? "";
}

export function getWebsiteMockVariant(
  versions: Version[],
  versionNumber: number
): 1 | 2 {
  const match = getVersionByNumber(versions, versionNumber);
  if (match?.mockVariant) return match.mockVariant;
  return versionNumber >= 2 ? 2 : 1;
}

export function getPreviousVersionNumber(
  versions: Version[],
  versionNumber: number
): number | null {
  const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
  const idx = sorted.findIndex((v) => v.versionNumber === versionNumber);
  if (idx <= 0) return null;
  return sorted[idx - 1].versionNumber;
}
