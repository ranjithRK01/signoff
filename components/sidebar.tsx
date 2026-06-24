"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getProjects, type Project } from "@/lib/api";
import { CreateProjectModal } from "@/components/CreateProjectModal";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const isClientReview = pathname?.startsWith("/review/");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const list = await getProjects();
      setProjects(list);
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [projects]);

  // Hide sidebar on client-facing review page
  if (isClientReview) {
    return null;
  }

  // Bottom actions: settings pinned bottom-left
  const bottomItems = [
    {
      name: "Dashboard",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      name: "Settings",
      href: "#",
      icon: Settings,
      disabled: true,
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-border bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/projects" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-base">
            Q
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900">
            QuickQA
          </span>
        </Link>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col px-4 py-5 overflow-hidden">
        {/* Top actions (like reference UI) */}
        <CreateProjectModal onProjectCreated={fetchProjects} />

        {/* Project list pinned in left menu */}
        <div className="space-y-2 mt-6 overflow-y-auto pr-1">
          <div className="flex items-center justify-between px-2">
            <p className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wide">
              Projects
            </p>
            <div className="text-[11px] font-semibold text-muted-foreground"> </div>
          </div>

          <div className="space-y-1">
            {sortedProjects.slice(0, 20).map((p) => {
              const projectId = p._id || p.id;
              const isProjectActive = pathname === `/projects/${projectId}` || pathname?.startsWith(`/projects/${projectId}/`);
              return (
                <Link
                  key={projectId}
                  href={`/projects/${projectId}`}
                  onClick={() => localStorage.setItem("lastProjectId", projectId)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    isProjectActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-muted-foreground hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
                  title={p.name}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/70" />
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}

            {sortedProjects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground italic">
                No projects yet
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom actions: settings pinned bottom-left */}
      <div className="px-4 pb-4 space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.disabled ? "#" : item.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                item.disabled
                  ? "text-muted-foreground/45 cursor-not-allowed"
                  : isActive
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-muted-foreground hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-zinc-900" : "text-muted-foreground"}`} />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Footer Workspace Info */}
      <div className="p-4 border-t border-border bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-semibold">
            AG
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-900 truncate">Agency Workspace</p>
            <p className="text-[10px] text-muted-foreground truncate">workspace@signoff.ai</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
