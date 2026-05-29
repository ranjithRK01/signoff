"use client";

import { usePathname } from "next/navigation";

export function Topbar() {
  const pathname = usePathname();

  // Hide topbar on client magic link reviews
  if (pathname?.startsWith("/review/")) {
    return null;
  }

  let title = "Dashboard";
  if (pathname === "/projects" || pathname === "/") {
    title = "Projects";
  } else if (pathname?.match(/^\/projects\/[^/]+$/)) {
    title = "Project Details";
  } else if (pathname?.match(/^\/projects\/[^/]+\/reviews\/[^/]+$/)) {
    title = "Review Workspace";
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-white px-8">
      <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">{title}</h2>
      <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
        <span>signoff.ai Proof of Concept</span>
      </div>
    </header>
  );
}
