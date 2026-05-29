"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichCommentEditor } from "@/components/review/rich-comment-editor";
import type { PendingAnnotation } from "@/components/review/image-annotation-canvas";
import { isCommentEmpty } from "@/lib/commentText";

type PinCommentDockProps = {
  annotation: PendingAnnotation;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  suggestions?: React.ReactNode;
};

const kindLabels: Record<PendingAnnotation["kind"], { title: string; save: string }> = {
  pin: { title: "New pin comment", save: "Save pin comment" },
  rectangle: { title: "New area highlight", save: "Save area comment" },
  arrow: { title: "New arrow mark", save: "Save arrow comment" },
};

function positionSummary(annotation: PendingAnnotation): string {
  if (annotation.kind === "rectangle" && annotation.width != null && annotation.height != null) {
    return `Area: ${annotation.x.toFixed(0)}% × ${annotation.y.toFixed(0)}% — ${annotation.width.toFixed(0)}% × ${annotation.height.toFixed(0)}%`;
  }
  if (annotation.kind === "arrow" && annotation.endX != null && annotation.endY != null) {
    return `Arrow: (${annotation.x.toFixed(0)}%, ${annotation.y.toFixed(0)}%) → (${annotation.endX.toFixed(0)}%, ${annotation.endY.toFixed(0)}%)`;
  }
  return `Position: ${annotation.x.toFixed(0)}% × ${annotation.y.toFixed(0)}%`;
}

export function PinCommentDock({
  annotation,
  value,
  onChange,
  onCancel,
  onSubmit,
  isSubmitting,
  suggestions,
}: PinCommentDockProps) {
  const labels = kindLabels[annotation.kind];
  const empty = isCommentEmpty(value);

  return (
    <div className="border border-red-200 bg-red-50/40 rounded-lg p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-red-600">{labels.title}</p>
          <p className="text-[10px] text-muted-foreground">{positionSummary(annotation)}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-zinc-900 p-1"
          aria-label="Cancel annotation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <RichCommentEditor
          value={value}
          onChange={onChange}
          placeholder="Type feedback... use @ to tag someone. Format with bold, lists, and links."
        />
        {suggestions}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || empty}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-md"
        >
          {isSubmitting ? "Saving..." : labels.save}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="text-xs h-9 rounded-md border-border">
          Cancel
        </Button>
      </div>
    </div>
  );
}
