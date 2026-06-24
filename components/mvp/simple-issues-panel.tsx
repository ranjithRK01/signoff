"use client";

import { useState } from "react";
import { Check, X, Loader2, AlertCircle, Info, Layout, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ReviewItem, ReviewItemStatus, IssueType } from "@/lib/types";
import { statusLabel } from "@/lib/workflow";

const statusColor: Record<ReviewItemStatus, string> = {
  REQUESTED: "bg-zinc-100 text-zinc-700",
  WORKING: "bg-blue-50 text-blue-800",
  READY_FOR_REVIEW: "bg-amber-50 text-amber-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  NEEDS_MORE_WORK: "bg-rose-50 text-rose-800",
};

type SimpleIssuesPanelProps = {
  items: ReviewItem[];
  viewingVersion?: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  filter: "all" | "validate";
  onFilterChange: (f: "all" | "validate") => void;
  validateCount: number;
  onApprove: (id: string) => void;
  onNeedsWork: (id: string) => void;
  actingId: string | null;
  newIssueText: string;
  onNewIssueTextChange: (t: string) => void;
  onSaveNewIssue: (details?: {
    issueType: IssueType;
    functional?: {
      expectedResult: string;
      actualResult: string;
      stepsToReproduce: string;
    };
  }) => void;
  onCancelNewIssue: () => void;
  showNewIssue: boolean;
  pendingKind?: "pin" | "rectangle" | "arrow";
  saving: boolean;
};

function IssueScreenshot({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1.5 border border-amber-100">
        Screenshot failed to load — capture again after the site has fully loaded.
      </p>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Issue screenshot"
      className="rounded border border-zinc-200 w-full bg-zinc-100 min-h-[80px] object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function SimpleIssuesPanel({
  items,
  viewingVersion,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  validateCount,
  onApprove,
  onNeedsWork,
  actingId,
  newIssueText,
  onNewIssueTextChange,
  onSaveNewIssue,
  onCancelNewIssue,
  showNewIssue,
  pendingKind,
  saving,
}: SimpleIssuesPanelProps) {
  const [issueType, setIssueType] = useState<IssueType>("VISUAL");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");

  const filtered =
    filter === "validate"
      ? items.filter((i) => i.status === "READY_FOR_REVIEW")
      : items;

  const handleSave = () => {
    onSaveNewIssue({
      issueType,
      functional: issueType === "FUNCTIONAL" ? {
        expectedResult,
        actualResult,
        stepsToReproduce,
      } : undefined
    });
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-zinc-200 w-full max-w-sm">
      <div className="p-3 border-b border-zinc-200 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">
          Issues{viewingVersion != null ? ` · V${viewingVersion}` : ""}
        </h2>
        <p className="text-[10px] text-zinc-500 leading-snug">
          <strong>Browse</strong> the site first, then use Pin / Crop / Arrow.{" "}
          <strong>To validate</strong> lists issues after a new version is submitted.
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
              filter === "all" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange("validate")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium ${
              filter === "validate" ? "bg-amber-600 text-white" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            To validate ({validateCount})
          </button>
        </div>
      </div>

      {showNewIssue && (
        <div className="p-3 border-b border-zinc-200 bg-indigo-50/50 space-y-3 overflow-y-auto max-h-[70vh]">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-800">
              New issue
              {pendingKind === "rectangle"
                ? " (crop area)"
                : pendingKind === "arrow"
                  ? " (arrow)"
                  : " (pin)"}
            </p>
            <p className="text-[10px] text-zinc-500">
              Captures the visible frame + page URL and browser metadata.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-zinc-500 font-bold">Category</Label>
            <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VISUAL">Visual</SelectItem>
                <SelectItem value="FUNCTIONAL">Functional</SelectItem>
                <SelectItem value="CONTENT">Content</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-zinc-500 font-bold">Description</Label>
            <Textarea
              value={newIssueText}
              onChange={(e) => onNewIssueTextChange(e.target.value)}
              placeholder="What needs to be fixed?"
              className="text-sm min-h-[80px] bg-white"
              autoFocus
            />
          </div>

          {issueType === "FUNCTIONAL" && (
            <div className="space-y-3 pt-2 border-t border-indigo-100">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">Steps to reproduce</Label>
                <Textarea
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  placeholder="1. Click login..."
                  className="text-xs min-h-[60px] bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">Expected result</Label>
                <Input
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  placeholder="Should show dashboard"
                  className="text-xs h-8 bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-zinc-500 font-bold">Actual result</Label>
                <Input
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  placeholder="Shows error page"
                  className="text-xs h-8 bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={saving || !newIssueText.trim()}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="outline" className="bg-white" onClick={onCancelNewIssue}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {filtered.length === 0 ? (
          <li className="p-4 text-xs text-zinc-500 text-center">
            {filter === "validate"
              ? "Nothing waiting for validation on this version."
              : viewingVersion != null
                ? `No issues on version ${viewingVersion} yet. Use Pin, Crop, or Arrow on the page.`
                : "No issues yet. Choose Pin, Crop, or Arrow — then click or drag on the page."}
          </li>
        ) : (
          filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(selectedId === item.id ? null : item.id)}
                className={`w-full text-left px-3 py-3 hover:bg-zinc-50 ${
                  selectedId === item.id ? "bg-indigo-50" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold">
                    {item.itemNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {item.issueType === "VISUAL" && <Layout className="h-3 w-3 text-blue-500" />}
                      {item.issueType === "FUNCTIONAL" && <AlertCircle className="h-3 w-3 text-rose-500" />}
                      {item.issueType === "CONTENT" && <Type className="h-3 w-3 text-amber-500" />}
                      {item.issueType === "GENERAL" && <Info className="h-3 w-3 text-zinc-500" />}
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                        {item.issueType}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-900 truncate">{item.title}</p>
                    <span
                      className={`inline-block mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColor[item.status]}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>
                </div>
              </button>

              {selectedId === item.id && (
                <div className="px-3 pb-3 space-y-4 border-t border-zinc-100 bg-zinc-50/80">
                  <div className="pt-3 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm text-zinc-700 font-medium leading-relaxed">{item.description}</p>
                    </div>
                    
                    {item.issueType === "FUNCTIONAL" && item.functional && (
                      <div className="bg-white rounded-lg border border-zinc-200 p-3 space-y-3 text-[11px] shadow-sm">
                        {item.functional.stepsToReproduce && (
                          <div>
                            <span className="font-bold text-zinc-400 uppercase text-[9px] block mb-1">Steps to Reproduce</span>
                            <p className="text-zinc-600 leading-relaxed">{item.functional.stepsToReproduce}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="font-bold text-zinc-400 uppercase text-[9px] block mb-1">Expected Result</span>
                            <p className="text-emerald-700 font-medium">{item.functional.expectedResult}</p>
                          </div>
                          <div>
                            <span className="font-bold text-zinc-400 uppercase text-[9px] block mb-1">Actual Result</span>
                            <p className="text-rose-700 font-medium">{item.functional.actualResult}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.annotation && (
                      <div className="bg-white rounded-lg border border-zinc-200 p-3 space-y-2 text-[10px] text-zinc-500 font-mono shadow-sm">
                        <span className="font-bold text-zinc-400 uppercase text-[9px] block mb-1 font-sans">Evidence Metadata</span>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div className="flex justify-between">
                            <span>Browser</span>
                            <span className="text-zinc-900 font-bold">{item.annotation.browser} {item.annotation.browserVersion}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>OS</span>
                            <span className="text-zinc-900 font-bold">{item.annotation.os}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Viewport</span>
                            <span className="text-zinc-900 font-bold">{item.annotation.viewport.width}x{item.annotation.viewport.height}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Time</span>
                            <span className="text-zinc-900 font-bold">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {item.cropImageUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Crop Area</span>
                        <div className="rounded-lg overflow-hidden border border-zinc-200 bg-white shadow-sm">
                          <IssueScreenshot src={item.cropImageUrl} />
                        </div>
                      </div>
                    )}
                    
                    {item.annotatedScreenshotUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Annotated Context</span>
                        <div className="rounded-lg overflow-hidden border border-zinc-200 bg-white shadow-sm">
                          <IssueScreenshot src={item.annotatedScreenshotUrl} />
                        </div>
                      </div>
                    )}

                    {item.screenshotUrl && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Full Viewport</span>
                        <div className="rounded-lg overflow-hidden border border-zinc-200 bg-white shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                          <IssueScreenshot src={item.screenshotUrl} />
                        </div>
                      </div>
                    )}

                    {!item.screenshotUrl && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1.5 border border-amber-100">
                        No screenshots available for this issue.
                      </p>
                    )}
                  </div>

                  {item.status === "READY_FOR_REVIEW" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={actingId === item.id}
                        onClick={() => onApprove(item.id)}
                      >
                        {actingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" /> Fixed
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-700"
                        disabled={actingId === item.id}
                        onClick={() => onNeedsWork(item.id)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Not fixed
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
