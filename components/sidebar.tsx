"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Settings, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createProject, getProjects, type Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const isClientReview = pathname?.startsWith("/review/");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createClientName, setCreateClientName] = useState("");
  const [createClientEmail, setCreateClientEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const items = [
    {
      name: "Projects",
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getProjects();
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) setProjects([]);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-border bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/projects" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-base">
            S
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900">
            signoff<span className="text-indigo-500 font-bold">.ai</span>
          </span>
        </Link>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col px-4 py-5 overflow-hidden">
        {/* Top actions (like reference UI) */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger
            render={
              <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-md flex items-center gap-2" />
            }
          >
            <Plus className="h-4 w-4" /> Create project
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!createName || !createClientName || !createClientEmail) {
                  toast.error("Please fill in all fields.");
                  return;
                }
                try {
                  setIsCreating(true);
                  const newProj = await createProject({
                    name: createName,
                    clientName: createClientName,
                    clientEmail: createClientEmail,
                  });
                  toast.success("Project created ✅");
                  setIsCreateOpen(false);
                  setCreateName("");
                  setCreateClientName("");
                  setCreateClientEmail("");
                  const list = await getProjects();
                  setProjects(list);
                  localStorage.setItem("lastProjectId", newProj.id);
                  router.push(`/projects/${newProj.id}`);
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to create project.");
                } finally {
                  setIsCreating(false);
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
                <DialogDescription>Add a new project to start collecting reviews.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="createProjectName">Project Name</Label>
                  <Input
                    id="createProjectName"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="border-border rounded-md"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="createClientName">Client Name</Label>
                  <Input
                    id="createClientName"
                    value={createClientName}
                    onChange={(e) => setCreateClientName(e.target.value)}
                    required
                    className="border-border rounded-md"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="createClientEmail">Client Email</Label>
                  <Input
                    id="createClientEmail"
                    type="email"
                    value={createClientEmail}
                    onChange={(e) => setCreateClientEmail(e.target.value)}
                    required
                    className="border-border rounded-md"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white w-full rounded-md"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
              const isProjectActive = pathname === `/projects/${p.id}` || pathname?.startsWith(`/projects/${p.id}/`);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  onClick={() => localStorage.setItem("lastProjectId", p.id)}
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
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No projects yet
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom actions: settings pinned bottom-left */}
      <div className="px-4 pb-4">
        {items
          .filter((i) => i.name === "Settings")
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
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
