"use client";

import { useEffect, useState } from "react";
import {
  createReviewComment,
  getReviewComments,
  type ReviewItem,
  type ReviewComment,
} from "@/lib/api";
import { ReviewItemStatusBadge } from "@/components/mvp/review-status-badge";
import { ActivityTimeline } from "@/components/mvp/activity-timeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ReviewItemSidebar({
  item,
  projectId,
  onClose,
}: {
  item: ReviewItem;
  projectId: string;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getReviewComments(item.id).then(setComments).catch(() => setComments([]));
  }, [item.id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const c = await createReviewComment({
        reviewItemId: item.id,
        reviewId: item.reviewId,
        text: newComment.trim(),
        authorId: "user-reviewer",
        authorName: "Reviewer",
      });
      setComments((prev) => [...prev, c]);
      setNewComment("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-white w-full max-w-md">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-zinc-900 truncate pr-2">
          #{item.itemNumber} {item.title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-zinc-900"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <ReviewItemStatusBadge status={item.status} />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            {item.issueType}
          </span>
          <span className="text-[10px] font-semibold uppercase text-zinc-600">
            {item.priority}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-muted-foreground">Created in</span>
            <p className="font-semibold">V{item.createdInVersion}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Current version</span>
            <p className="font-semibold">V{item.latestVersion}</p>
          </div>
        </div>

        <p className="text-sm text-zinc-700">{item.description}</p>

        {item.functional && (
          <div className="rounded-lg border border-border p-3 space-y-2 text-xs bg-zinc-50">
            <div>
              <span className="font-semibold text-zinc-800">Expected</span>
              <p className="text-zinc-600 mt-0.5">{item.functional.expectedResult}</p>
            </div>
            <div>
              <span className="font-semibold text-zinc-800">Actual</span>
              <p className="text-zinc-600 mt-0.5">{item.functional.actualResult}</p>
            </div>
            <div>
              <span className="font-semibold text-zinc-800">Steps</span>
              <pre className="text-zinc-600 mt-0.5 whitespace-pre-wrap font-sans">
                {item.functional.stepsToReproduce}
              </pre>
            </div>
            <p className="text-muted-foreground">{item.functional.environment}</p>
          </div>
        )}

        {item.screenshotUrl && (
          <div className="rounded-lg border border-border overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.screenshotUrl}
              alt="Issue screenshot"
              className="w-full h-auto"
            />
          </div>
        )}

        {item.annotation && (
          <div className="rounded-lg border border-border p-3 text-[10px] space-y-1 text-muted-foreground">
            <p>
              <span className="font-semibold text-zinc-700">Page:</span>{" "}
              {item.annotation.pageUrl}
            </p>
            <p>
              {item.annotation.browser} {item.annotation.browserVersion} · {item.annotation.os} ·{" "}
              {item.annotation.deviceMode}
            </p>
            <p>
              Viewport {item.annotation.viewport.width}×{item.annotation.viewport.height}
            </p>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold text-zinc-900 mb-2">Comments</h3>
          <ul className="space-y-2 mb-3">
            {comments.map((c) => (
              <li key={c.id} className="text-xs bg-zinc-50 rounded p-2">
                <span className="font-semibold">{c.authorName}</span>
                <p className="text-zinc-700 mt-0.5">{c.text}</p>
              </li>
            ))}
          </ul>
          <Label htmlFor="sidebar-comment" className="sr-only">
            Add comment
          </Label>
          <Textarea
            id="sidebar-comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="text-xs min-h-[60px]"
          />
          <Button
            size="sm"
            className="mt-2 w-full bg-zinc-900 hover:bg-zinc-800"
            disabled={submitting || !newComment.trim()}
            onClick={handleAddComment}
          >
            Post comment
          </Button>
        </div>

        <div>
          <h3 className="text-xs font-bold text-zinc-900 mb-2">Activity</h3>
          <ActivityTimeline projectId={projectId} reviewId={item.reviewId} />
        </div>
      </div>
    </div>
  );
}
