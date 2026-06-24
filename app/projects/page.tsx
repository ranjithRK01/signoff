"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Monitor } from "lucide-react";

import { getProjects, type Project } from "@/lib/api";
import { CreateProjectModal } from "@/components/CreateProjectModal";

export default function ProjectsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasProjects, setHasProjects] = useState(false);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const list: Project[] = await getProjects();
      
      if (list.length > 0) {
        setHasProjects(true);
        const lastProjectId = typeof window !== "undefined" ? localStorage.getItem("lastProjectId") : null;
        const target = lastProjectId && list.some((p) => (p._id || p.id) === lastProjectId) ? lastProjectId : (list[0]._id || list[0].id);

        if (target) {
          router.replace(`/projects/${target}`);
        }
      } else {
        setHasProjects(false);
      }
    } catch (err) {
      setHasProjects(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center flex flex-col items-center">
        <div className="w-24 h-24 bg-zinc-50 rounded-[32px] flex items-center justify-center mb-8 border border-zinc-100 shadow-sm animate-in zoom-in duration-500">
           <Monitor className="text-zinc-300" size={48} />
        </div>
        
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">No projects yet</h1>
        <p className="text-zinc-500 mb-10 leading-relaxed">
          Create your first project to start reviewing your live application with your team.
        </p>

        <CreateProjectModal onProjectCreated={fetchProjects} />
      </div>
    </div>
  );
}
