"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MvpAnnotatedSiteViewer } from "@/components/mvp/mvp-annotated-site-viewer";
import { SimpleIssuesPanel } from "@/components/mvp/simple-issues-panel";
import { PageExplorer } from "@/components/mvp/page-explorer";
import type { PendingAnnotation } from "@/components/review/image-annotation-canvas";
import {
  approveRelease,
  createReviewItem,
  getReviewItems,
  getVersions,
  setReviewItemStatus,
  submitNewVersion,
  type Project,
  type ReviewSession,
  type Version,
} from "@/lib/api";
import type { AnnotationKind } from "@/lib/api";
import {
  getCurrentVersionNumber,
  getWebsiteMockVariant,
  getWebsiteReviewUrl,
} from "@/lib/reviewVersions";
import { computeDashboardStats, canApproveRelease } from "@/lib/workflow";
import {
  canAnnotateVersion,
  getItemsForViewingVersion,
} from "@/lib/reviewItemFilters";
import {
  buildAnnotationCaptureFromPending,
  DEFAULT_FRAME_SCROLL,
  getDomContextAtPoint,
  scrollIframeToAnnotation,
  type FrameScrollState,
} from "@/lib/annotationGeometry";
import { captureBrowserMetadata } from "@/lib/browserMeta";
import { captureIssueEvidence } from "@/lib/screenshotCapture";

type MvpReviewWorkspaceProps = {
  project: Project;
  review: ReviewSession;
  projectId: string;
};

export function MvpReviewWorkspace({ project, review, projectId }: MvpReviewWorkspaceProps) {
  const searchParams = useSearchParams();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameScrollRef = useRef<FrameScrollState>(DEFAULT_FRAME_SCROLL);
  const userPickedVersionRef = useRef(false);

  const [versions, setVersions] = useState<Version[]>([]);
  const [items, setItems] = useState<Awaited<ReturnType<typeof getReviewItems>>>([]);
  const [viewingVersion, setViewingVersion] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPageUrl, setSelectedPageUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "validate">(
    searchParams.get("tab") === "validate" ? "validate" : "all"
  );
  const [tool, setTool] = useState<AnnotationKind>("pin");
  const [pending, setPending] = useState<PendingAnnotation | null>(null);
  const [framePageUrl, setFramePageUrl] = useState("");
  const [newIssueText, setNewIssueText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionUrl, setVersionUrl] = useState("");
  const [versionNotes, setVersionNotes] = useState("");

  const refresh = useCallback(async () => {
    const [v, i] = await Promise.all([getVersions(review.id), getReviewItems(review.id)]);
    setVersions(v);
    setItems(i);
    const current =
      v.find((x) => x.id === review.currentVersionId)?.versionNumber ??
      v.at(-1)?.versionNumber ??
      1;
    if (!userPickedVersionRef.current) {
      setViewingVersion(current);
    }
    const url = getWebsiteReviewUrl(v, current);
    setVersionUrl(url);
    if (!userPickedVersionRef.current) {
      setFramePageUrl(url);
    }
  }, [review]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const currentVersionNum = getCurrentVersionNumber(review, versions);
  const reviewUrl = getWebsiteReviewUrl(versions, viewingVersion);
  const mockVariant = getWebsiteMockVariant(versions, viewingVersion);
  const versionItems = getItemsForViewingVersion(items, viewingVersion);
  const filteredItems = selectedPageUrl 
    ? versionItems.filter(i => i.annotation?.pageUrl === selectedPageUrl)
    : versionItems;
  const stats = computeDashboardStats(versionItems);
  const canAnnotate = canAnnotateVersion(viewingVersion, currentVersionNum);
  const canSignOff = canApproveRelease(items) && review.status !== "APPROVED";

  useEffect(() => {
    setFramePageUrl(reviewUrl);
    setSelectedId(null);
    setPending(null);
  }, [viewingVersion, reviewUrl]);

  const handleSelectItem = (id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (item?.annotation) {
      scrollIframeToAnnotation(iframeRef.current, item.annotation);
    }
  };

  const handleSaveIssue = async (details?: {
    issueType: IssueType;
    functional?: {
      expectedResult: string;
      actualResult: string;
      stepsToReproduce: string;
    };
  }) => {
    if (!canAnnotate) {
      toast.error("Switch to the latest version to add new issues.");
      return;
    }
    if (!pending || !newIssueText.trim()) return;
    const text = newIssueText.trim();
    const title = text.length > 60 ? `${text.slice(0, 57)}...` : text;
    try {
      setSubmitting(true);
      let evidence: { 
        screenshot: Blob | null; 
        annotatedScreenshot: Blob | null; 
        cropScreenshot: Blob | null;
        thumbnail: Blob | null 
      } = {
        screenshot: null,
        annotatedScreenshot: null,
        cropScreenshot: null,
        thumbnail: null,
      };
      
      if (viewportRef.current) {
        evidence = await captureIssueEvidence(viewportRef.current, iframeRef.current, pending);
      }
      
      if (!evidence.screenshot && !evidence.annotatedScreenshot) {
        toast.warning(
          "Screenshot was empty — wait for the site to finish loading, use Browse mode, then save again."
        );
      }
      const browser = captureBrowserMetadata();
      const overlaySize = {
        width: viewportRef.current?.clientWidth ?? 1280,
        height: viewportRef.current?.clientHeight ?? 800,
      };

      const domContext = getDomContextAtPoint(iframeRef.current, pending.x, pending.y);

      const annotation = buildAnnotationCaptureFromPending(
        pending,
        frameScrollRef.current,
        overlaySize,
        {
          pageUrl: framePageUrl || reviewUrl,
          pageTitle: document.title,
          viewport: overlaySize,
          deviceMode: "Desktop",
          browser: browser?.browser,
          browserVersion: browser?.browserVersion,
          os: browser?.os,
          timestamp: new Date().toISOString(),
          annotationKind: pending.kind,
          domContext,
        }
      );

      await createReviewItem({
        reviewId: review.id,
        projectId,
        title,
        description: text,
        issueType: details?.issueType || "VISUAL",
        priority: "MEDIUM",
        createdBy: "user-reviewer",
        createdByLabel: project.clientName,
        createdInVersion: viewingVersion,
        annotation,
        functional: details?.functional ? {
          ...details.functional,
          environment: browser?.os || "Unknown",
        } : undefined,
        screenshotBlob: evidence.screenshot,
        annotatedScreenshotBlob: evidence.annotatedScreenshot,
        thumbnailBlob: evidence.thumbnail,
      });
      toast.success("Issue saved with screenshot & metadata");
      setPending(null);
      setNewIssueText("");
      await refresh();
    } catch (err) {
      console.error("createReviewItem failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Could not save issue — check API on port 3003"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemDecision = async (itemId: string, approve: boolean) => {
    try {
      setActingId(itemId);
      await setReviewItemStatus({
        itemId,
        reviewId: review.id,
        projectId,
        status: approve ? "APPROVED" : "NEEDS_MORE_WORK",
        userId: "user-reviewer",
        userLabel: project.clientName,
        latestVersion: currentVersionNum,
      });
      toast.success(approve ? "Marked as fixed" : "Sent back for more work");
      setSelectedId(null);
      await refresh();
    } catch {
      toast.error("Update failed");
    } finally {
      setActingId(null);
    }
  };

  const handleSubmitVersion = async () => {
    if (!versionUrl.trim()) return;
    try {
      setSubmitting(true);
      await submitNewVersion({
        reviewId: review.id,
        projectId,
        liveUrl: versionUrl.trim(),
        releaseNotes: versionNotes.trim() || undefined,
        submittedBy: "user-dev",
        submittedByLabel: "Developer",
      });
      toast.success("Version submitted — open issues moved to To validate");
      setVersionOpen(false);
      setVersionNotes("");
      userPickedVersionRef.current = false;
      await refresh();
      setFilter("validate");
    } catch {
      toast.error("Could not submit version");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOff = async () => {
    if (!canSignOff) return;
    try {
      setApproving(true);
      await approveRelease({
        reviewId: review.id,
        projectId,
        approvedVersion: currentVersionNum,
        approvedBy: "user-reviewer",
        approvedByLabel: project.clientName,
      });
      toast.success("Release signed off");
      await refresh();
    } catch {
      toast.error("Sign-off failed");
    } finally {
      setApproving(false);
    }
  };

  const handleFramePageUrlChange = (url: string) => {
    if (url.includes("/api/website-proxy")) {
      // If it's already proxied, we might need to extract the real URL
      try {
        const u = new URL(url, window.location.origin);
        const target = u.searchParams.get("url");
        if (target) {
          setFramePageUrl(target);
          return;
        }
      } catch {}
    }
    setFramePageUrl(url);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-200 shrink-0">
        <Link
          href={`/projects/${projectId}`}
          className="text-zinc-500 hover:text-zinc-900"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-zinc-900 truncate">{review.title}</h1>
          <p className="text-xs text-zinc-500">
            V{viewingVersion}: {stats.approved} of {stats.total} issues approved
            {review.status === "APPROVED" && " · Signed off"}
            {!canAnnotate && " · Viewing older version (read-only)"}
          </p>
        </div>

        {versions.length > 1 && (
          <select
            value={viewingVersion}
            onChange={(e) => {
              userPickedVersionRef.current = true;
              setViewingVersion(Number(e.target.value));
            }}
            className="h-9 rounded-md border border-zinc-200 text-sm px-2 bg-white"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.versionNumber}>
                Version {v.versionNumber}
                {v.id === review.currentVersionId ? " (latest)" : ""}
              </option>
            ))}
          </select>
        )}

        <Button
          size="sm"
          variant="outline"
          className="hidden sm:flex"
          onClick={() => setVersionOpen(true)}
        >
          <Upload className="h-4 w-4 mr-1" /> New version
        </Button>

        {canSignOff && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={approving}
            onClick={handleSignOff}
          >
            {approving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" /> Sign off
              </>
            )}
          </Button>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        <PageExplorer 
          items={versionItems}
          selectedPageUrl={selectedPageUrl}
          onSelectPage={setSelectedPageUrl}
        />
        
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <MvpAnnotatedSiteViewer
            reviewUrl={reviewUrl}
            mockVariant={mockVariant}
            items={versionItems}
            canAnnotate={canAnnotate}
            activeItemId={selectedId}
            tool={tool}
            onToolChange={setTool}
            pending={pending}
            onPendingChange={setPending}
            onSelectItem={(id) => handleSelectItem(id)}
            framePageUrl={framePageUrl}
            onFramePageUrlChange={handleFramePageUrlChange}
            viewportCaptureRef={viewportRef}
            iframeRef={iframeRef}
            onFrameScrollChange={(frame) => {
              frameScrollRef.current = frame;
            }}
          />
        </div>

        <SimpleIssuesPanel
          items={filteredItems}
          viewingVersion={viewingVersion}
          selectedId={selectedId}
          onSelect={handleSelectItem}
          filter={filter}
          onFilterChange={setFilter}
          validateCount={stats.awaitingValidation}
          onApprove={(id) => handleItemDecision(id, true)}
          onNeedsWork={(id) => handleItemDecision(id, false)}
          actingId={actingId}
          newIssueText={newIssueText}
          onNewIssueTextChange={setNewIssueText}
          onSaveNewIssue={handleSaveIssue}
          onCancelNewIssue={() => {
            setPending(null);
            setNewIssueText("");
          }}
          showNewIssue={Boolean(pending)}
          pendingKind={pending?.kind}
          saving={submitting}
        />
      </div>

      <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Submit fixed version</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="vurl">Live URL</Label>
              <Input
                id="vurl"
                value={versionUrl}
                onChange={(e) => setVersionUrl(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="vnotes">What changed (optional)</Label>
              <Input
                id="vnotes"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                className="mt-1"
                placeholder="e.g. Fixed CTA contrast"
              />
            </div>
            <p className="text-xs text-zinc-500">
              After submit, open issues move to <strong>To validate</strong> for reviewer sign-off.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitVersion} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
