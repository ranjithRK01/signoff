"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getProject, getReview } from "@/lib/api";
import { MvpReviewWorkspace } from "@/components/mvp/mvp-review-workspace";

export default function ReviewPage() {
  const { id: projectId, reviewId } = useParams() as { id: string; reviewId: string };
  const [ready, setReady] = useState(false);
  const [project, setProject] = useState<Awaited<ReturnType<typeof getProject>> | null>(null);
  const [review, setReview] = useState<Awaited<ReturnType<typeof getReview>> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rev = await getReview(reviewId);
        const proj = await getProject(rev.projectId);
        setReview(rev);
        setProject(proj);
        setReady(true);
      } catch {
        toast.error("Failed to load review.");
      }
    })();
  }, [reviewId]);

  if (!ready || !project || !review) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <MvpReviewWorkspace project={project} review={review} projectId={projectId} />
    </Suspense>
  );
}
