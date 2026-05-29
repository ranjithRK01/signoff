"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getProjects, type Project } from "@/lib/api";

export default function ProjectsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const list: Project[] = await getProjects();
        if (cancelled) return;

        const lastProjectId = typeof window !== "undefined" ? localStorage.getItem("lastProjectId") : null;
        const target = lastProjectId && list.some((p) => p.id === lastProjectId) ? lastProjectId : list[0]?.id;

        if (target) {
          router.replace(`/projects/${target}`);
          return;
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading workspace...
        </div>
      ) : (
        <div className="text-sm text-muted-foreground font-semibold">Create a project to get started.</div>
      )}
    </div>
  );
}
