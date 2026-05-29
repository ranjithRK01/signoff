import type { Review, ReviewVersion } from "@/lib/api";

export function normalizeVersions(review: Review): ReviewVersion[] {
  if (review.versions && review.versions.length > 0) {
    return [...review.versions].sort((a, b) => a.version - b.version);
  }

  const v1: ReviewVersion = {
    version: 1,
    fileData: review.fileData,
    url: review.url,
    createdAt: review.createdAt,
  };
  return [v1];
}

export function getCurrentVersionNumber(review: Review): number {
  const versions = normalizeVersions(review);
  if (review.currentVersion && versions.some((v) => v.version === review.currentVersion)) {
    return review.currentVersion;
  }
  return versions[versions.length - 1]?.version ?? 1;
}

export function getVersionAsset(review: Review, versionNumber: number): string | undefined {
  const versions = normalizeVersions(review);
  const match = versions.find((v) => v.version === versionNumber);
  if (!match) return review.fileData || review.url;
  return review.type === "image" ? match.fileData : match.url;
}

export function getPreviousVersionNumber(review: Review, versionNumber: number): number | null {
  const versions = normalizeVersions(review);
  const idx = versions.findIndex((v) => v.version === versionNumber);
  if (idx <= 0) return null;
  return versions[idx - 1].version;
}
