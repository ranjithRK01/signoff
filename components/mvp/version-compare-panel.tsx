"use client";

import type { Version } from "@/lib/types";
import { getWebsiteReviewUrl } from "@/lib/reviewVersions";
import { getWebsiteIframeSrc } from "@/lib/websiteViewer";

export function VersionComparePanel({
  versions,
  viewingVersion,
}: {
  versions: Version[];
  viewingVersion: number;
}) {
  const prev = viewingVersion - 1;
  if (prev < 1) return null;

  const prevUrl = getWebsiteReviewUrl(versions, prev);
  const currentUrl = getWebsiteReviewUrl(versions, viewingVersion);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-zinc-100 rounded-lg border border-border overflow-hidden">
      <p className="shrink-0 px-4 py-2 text-[10px] text-muted-foreground border-b border-border bg-white">
        Compare V{prev} vs V{viewingVersion}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 flex-1 min-h-0">
        <div className="flex flex-col gap-2 min-h-[240px]">
          <p className="text-[10px] font-bold text-muted-foreground">V{prev}</p>
          <iframe
            src={getWebsiteIframeSrc(prevUrl, "proxy")}
            title={`Version ${prev}`}
            className="flex-1 w-full min-h-[240px] border border-border rounded-lg bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
        <div className="flex flex-col gap-2 min-h-[240px]">
          <p className="text-[10px] font-bold text-indigo-600">V{viewingVersion}</p>
          <iframe
            src={getWebsiteIframeSrc(currentUrl, "proxy")}
            title={`Version ${viewingVersion}`}
            className="flex-1 w-full min-h-[240px] border border-indigo-200 rounded-lg bg-white ring-1 ring-indigo-100"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
}
