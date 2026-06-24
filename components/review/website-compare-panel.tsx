"use client";

import { VersionComparePanel } from "@/components/mvp/version-compare-panel";
import type { Version } from "@/lib/types";

type WebsiteComparePanelProps = {
  versions: Version[];
  viewingVersion: number;
};

/** @deprecated Use VersionComparePanel */
export function WebsiteComparePanel({ versions, viewingVersion }: WebsiteComparePanelProps) {
  return <VersionComparePanel versions={versions} viewingVersion={viewingVersion} />;
}
