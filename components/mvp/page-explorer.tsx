"use client";

import { FileText, ChevronRight } from "lucide-react";
import type { ReviewItem } from "@/lib/types";

type PageGroup = {
  url: string;
  title: string;
  count: number;
};

type PageExplorerProps = {
  items: ReviewItem[];
  selectedPageUrl: string | null;
  onSelectPage: (url: string | null) => void;
};

export function PageExplorer({ items, selectedPageUrl, onSelectPage }: PageExplorerProps) {
  const groups = items.reduce((acc, item) => {
    const url = item.annotation?.pageUrl || "/";
    const title = item.annotation?.pageTitle || url;
    if (!acc[url]) {
      acc[url] = { url, title, count: 0 };
    }
    acc[url].count++;
    return acc;
  }, {} as Record<string, PageGroup>);

  const sortedGroups = Object.values(groups).sort((a, b) => b.count - a.count);

  return (
    <div className="w-64 border-r border-zinc-200 bg-zinc-50 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-200 bg-white">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Page Explorer
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          onClick={() => onSelectPage(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
            selectedPageUrl === null
              ? "bg-white text-zinc-900 shadow-sm border border-zinc-200 font-medium"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          }`}
        >
          <div className="flex-1 flex items-center gap-2 truncate">
            <span className="truncate">All Pages</span>
          </div>
          <span className="text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full font-bold">
            {items.length}
          </span>
        </button>

        {sortedGroups.map((group) => (
          <button
            key={group.url}
            onClick={() => onSelectPage(group.url)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
              selectedPageUrl === group.url
                ? "bg-white text-zinc-900 shadow-sm border border-zinc-200 font-medium"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            <div className="flex-1 flex items-center gap-2 truncate text-left">
              <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
              <div className="truncate">
                <div className="truncate font-medium leading-tight">
                  {group.title.split(" - ")[0]}
                </div>
                <div className="truncate text-[10px] text-zinc-400 font-mono">
                  {new URL(group.url, "https://a.com").pathname}
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full font-bold">
              {group.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
