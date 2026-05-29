"use client";

import { useRef, useState } from "react";
import { Columns2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addReviewVersion, type Review } from "@/lib/api";
import {
  getCurrentVersionNumber,
  getPreviousVersionNumber,
  getVersionAsset,
  normalizeVersions,
} from "@/lib/reviewVersions";

type VersionToolbarProps = {
  review: Review;
  viewingVersion: number;
  onViewingVersionChange: (v: number) => void;
  compareOpen: boolean;
  onCompareOpenChange: (open: boolean) => void;
  onReviewUpdated: (review: Review) => void;
  allowUpload?: boolean;
};

export function VersionToolbar({
  review,
  viewingVersion,
  onViewingVersionChange,
  compareOpen,
  onCompareOpenChange,
  onReviewUpdated,
  allowUpload = true,
}: VersionToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const versions = normalizeVersions(review);
  const currentVersion = getCurrentVersionNumber(review);
  const prevVersion = getPreviousVersionNumber(review, viewingVersion);

  const handleUploadVersion = async (file: File) => {
    try {
      setIsUploading(true);
      let fileData: string | undefined;
      let url: string | undefined;

      if (review.type === "image") {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const data = await uploadRes.json();
        fileData = data.url;
      } else {
        toast.error("For video reviews, paste a new URL in project settings (coming soon).");
        return;
      }

      const updated = await addReviewVersion(review.id, {
        fileData,
        url,
        note: `Uploaded ${file.name}`,
      });

      onReviewUpdated(updated);
      onViewingVersionChange(getCurrentVersionNumber(updated));
      toast.success(`Version v${getCurrentVersionNumber(updated)} uploaded ✅`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload new version.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (review.type !== "image") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        {versions.map((v) => (
          <button
            key={v.version}
            type="button"
            onClick={() => onViewingVersionChange(v.version)}
            className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
              viewingVersion === v.version
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-zinc-700 border-border hover:bg-zinc-50"
            }`}
          >
            v{v.version}
            {v.version === currentVersion ? " • current" : ""}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadVersion(file);
        }}
      />

      {allowUpload && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-8 border-border text-xs rounded-md font-semibold gap-1.5"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload v{versions.length + 1}
        </Button>
      )}

      {prevVersion !== null && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onCompareOpenChange(!compareOpen)}
          className={`h-8 border-border text-xs rounded-md font-semibold gap-1.5 ${
            compareOpen ? "bg-indigo-50 text-indigo-700 border-indigo-200" : ""
          }`}
          title="Compare previous version with current"
        >
          <Columns2 className="h-3.5 w-3.5" />
          Compare
        </Button>
      )}
    </div>
  );
}

export function VersionComparePanel({
  review,
  viewingVersion,
}: {
  review: Review;
  viewingVersion: number;
}) {
  const prev = getPreviousVersionNumber(review, viewingVersion);
  if (prev === null) return null;

  const prevSrc = getVersionAsset(review, prev);
  const currentSrc = getVersionAsset(review, viewingVersion);
  if (!prevSrc || !currentSrc) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-zinc-100">
      <p className="shrink-0 px-4 py-2 text-[10px] text-muted-foreground border-b border-border bg-white/80">
        Side-by-side compare — turn off Compare to annotate the current version.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 flex-1 min-h-0 overflow-auto">
        <div className="flex flex-col min-h-0 gap-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Previous (v{prev})</p>
          <div className="flex-1 min-h-[200px] border border-border rounded-lg bg-white overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={prevSrc}
              alt={`Version ${prev}`}
              className="max-w-full max-h-[min(420px,calc(100dvh-16rem))] w-auto h-auto object-contain"
            />
          </div>
        </div>
        <div className="flex flex-col min-h-0 gap-2">
          <p className="text-[10px] font-bold text-indigo-600 uppercase shrink-0">Current (v{viewingVersion})</p>
          <div className="flex-1 min-h-[200px] border border-indigo-200 rounded-lg bg-white overflow-hidden ring-1 ring-indigo-100 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentSrc}
              alt={`Version ${viewingVersion}`}
              className="max-w-full max-h-[min(420px,calc(100dvh-16rem))] w-auto h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
