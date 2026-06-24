import { logActivity } from "@/lib/activityLog";
import { captureBrowserMetadata } from "@/lib/browserMeta";
import { API_BASE_URL } from "@/lib/config";
import { normalizeReviewUrl } from "@/lib/websiteViewer";
import { uploadScreenshot } from "@/lib/uploadClient";
import type {
  AnnotationCapture,
  Approval,
  DeviceMode,
  FunctionalDetails,
  IssueType,
  Priority,
  Project,
  ReviewAttachment,
  ReviewComment,
  ReviewItem,
  ReviewItemStatus,
  ReviewSession,
  User,
  Version,
} from "@/lib/types";

export * from "@/lib/types";

const BASE_URL = "/api";

// ——— Projects ———

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE_URL}/projects`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function getProject(projectId: string): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${projectId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch project ${projectId}`);
  return res.json();
}

export async function createProject(
  data: { name: string; url: string; version?: string; description?: string }
): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function updateProject(
  projectId: string,
  data: Partial<Project>
): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update project ${projectId}`);
  return res.json();
}

// ——— Review sessions ———

export async function getReviews(projectId: string): Promise<ReviewSession[]> {
  const res = await fetch(`${BASE_URL}/reviews?projectId=${projectId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

export async function getReview(reviewId: string): Promise<ReviewSession> {
  const res = await fetch(`${BASE_URL}/reviews/${reviewId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch review ${reviewId}`);
  return res.json();
}

export async function createReviewSession(input: {
  projectId: string;
  title: string;
  liveUrl: string;
  createdBy: string;
  notes?: string;
}): Promise<ReviewSession> {
  const liveUrl = normalizeReviewUrl(input.liveUrl);
  if (!liveUrl) throw new Error("Live URL must be a full https:// address.");

  const version: Version = {
    id: id(),
    reviewId: "",
    versionNumber: 1,
    liveUrl,
    submittedBy: input.createdBy,
    submittedAt: new Date().toISOString(),
    notes: input.notes ?? "Initial submission",
    mockVariant: 1,
  };

  const review: ReviewSession = {
    id: id(),
    projectId: input.projectId,
    title: input.title,
    reviewType: "website",
    status: "IN_REVIEW",
    currentVersionId: version.id,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };

  version.reviewId = review.id;

  const reviewRes = await fetch(`${BASE_URL}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(review),
  });
  if (!reviewRes.ok) throw new Error("Failed to create review");

  const versionRes = await fetch(`${BASE_URL}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(version),
  });
  if (!versionRes.ok) throw new Error("Failed to create version");

  await logActivity({
    projectId: input.projectId,
    reviewId: review.id,
    action: "Review Created",
    user: input.createdBy,
    userLabel: input.createdBy,
    metadata: { title: input.title },
  });

  await logActivity({
    projectId: input.projectId,
    reviewId: review.id,
    action: "Version Submitted",
    user: input.createdBy,
    userLabel: input.createdBy,
    metadata: { versionNumber: 1, liveUrl: input.liveUrl },
  });

  return reviewRes.json();
}

export async function updateReviewSession(
  reviewId: string,
  data: Partial<ReviewSession>
): Promise<ReviewSession> {
  const res = await fetch(`${BASE_URL}/reviews/${reviewId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update review ${reviewId}`);
  return res.json();
}

// ——— Versions ———

export async function getVersions(reviewId: string): Promise<Version[]> {
  const res = await fetch(`${BASE_URL}/versions?reviewId=${reviewId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch versions");
  const versions: Version[] = await res.json();
  return versions.sort((a, b) => a.versionNumber - b.versionNumber);
}

export async function getVersion(versionId: string): Promise<Version> {
  const res = await fetch(`${BASE_URL}/versions/${versionId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch version");
  return res.json();
}

export async function getCurrentVersion(review: ReviewSession): Promise<Version> {
  return getVersion(review.currentVersionId);
}

export async function submitNewVersion(input: {
  reviewId: string;
  liveUrl: string;
  releaseNotes?: string;
  submittedBy: string;
  submittedByLabel: string;
  projectId: string;
}): Promise<{ version: Version; review: ReviewSession }> {
  const liveUrl = normalizeReviewUrl(input.liveUrl);
  if (!liveUrl) throw new Error("Live URL must be a full https:// address.");

  await getReview(input.reviewId);
  const versions = await getVersions(input.reviewId);
  const nextNumber = versions.length + 1;

  const version: Version = {
    id: id(),
    reviewId: input.reviewId,
    versionNumber: nextNumber,
    liveUrl,
    submittedBy: input.submittedBy,
    submittedAt: new Date().toISOString(),
    notes: input.releaseNotes,
    mockVariant: nextNumber >= 2 ? 2 : 1,
  };

  const versionRes = await fetch(`${BASE_URL}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(version),
  });
  if (!versionRes.ok) throw new Error("Failed to submit version");
  const createdVersion = await versionRes.json();

  const items = await getReviewItems(input.reviewId);
  for (const item of items) {
    const shouldValidate =
      item.status === "WORKING" ||
      item.status === "REQUESTED" ||
      item.status === "NEEDS_MORE_WORK";

    if (shouldValidate) {
      const from = item.status;
      await updateReviewItem(item.id, {
        status: "READY_FOR_REVIEW",
        latestVersion: nextNumber,
      });
      await logActivity({
        projectId: input.projectId,
        reviewId: input.reviewId,
        action: "Review Item Ready For Review",
        user: input.submittedBy,
        userLabel: input.submittedByLabel,
        metadata: {
          reviewItemId: item.id,
          from,
          to: "READY_FOR_REVIEW",
          versionNumber: nextNumber,
        },
      });
    } else if (item.status !== "APPROVED") {
      await updateReviewItem(item.id, { latestVersion: nextNumber });
    }
  }

  const updatedReview = await updateReviewSession(input.reviewId, {
    currentVersionId: createdVersion.id,
    status: "IN_REVIEW",
  });

  await logActivity({
    projectId: input.projectId,
    reviewId: input.reviewId,
    action: "Version Submitted",
    user: input.submittedBy,
    userLabel: input.submittedByLabel,
    metadata: {
      versionNumber: nextNumber,
      liveUrl: input.liveUrl,
      notes: input.releaseNotes,
    },
  });

  return { version: createdVersion, review: updatedReview };
}

// ——— Review items ———

export async function getReviewItems(reviewId: string): Promise<ReviewItem[]> {
  const res = await fetch(`${BASE_URL}/reviewItems?reviewId=${reviewId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch review items");
  const items: ReviewItem[] = await res.json();
  return items.sort((a, b) => a.itemNumber - b.itemNumber);
}

export async function getReviewItem(itemId: string): Promise<ReviewItem> {
  const res = await fetch(`${BASE_URL}/reviewItems/${itemId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch review item");
  return res.json();
}

export async function createReviewItem(input: {
  reviewId: string;
  projectId: string;
  title: string;
  description: string;
  issueType: IssueType;
  priority: Priority;
  createdBy: string;
  createdByLabel: string;
  createdInVersion: number;
  annotation?: Partial<AnnotationCapture>;
  functional?: FunctionalDetails;
  assignedTo?: string;
  screenshotBlob?: Blob | null;
  annotatedScreenshotBlob?: Blob | null;
  cropScreenshotBlob?: Blob | null;
  thumbnailBlob?: Blob | null;
}): Promise<ReviewItem> {
  const existing = await getReviewItems(input.reviewId);
  const browser = captureBrowserMetadata();
  const issueId = id();
  const deviceMode: DeviceMode =
    (input.annotation?.deviceMode as DeviceMode) ??
    (browser?.deviceType === "Mobile"
      ? "Mobile"
      : browser?.deviceType === "Tablet"
        ? "Tablet"
        : "Desktop");

  // Register page if possible
  let pageId: string | undefined;
  if (input.annotation?.pageUrl) {
    const page = await getOrCreatePage({
      reviewId: input.reviewId,
      pageUrl: input.annotation.pageUrl,
      pageTitle: input.annotation.pageTitle || "Untitled Page",
    });
    pageId = page.id;
  }

  const placeholderScreenshot = `https://placehold.co/800x500/e2e8f0/475569?text=Issue+${existing.length + 1}`;
  let screenshotUrl = placeholderScreenshot;
  let annotatedScreenshotUrl = placeholderScreenshot;
  let cropImageUrl = undefined;
  let thumbnailUrl = placeholderScreenshot;

  const storagePath = `reviews/${input.reviewId}/issues/${issueId}/`;
  const uploadPromises = [];

  if (input.screenshotBlob && input.screenshotBlob.size > 0) {
    uploadPromises.push(
      uploadScreenshot(input.screenshotBlob, "full.png", storagePath).then((url) => {
        screenshotUrl = url;
      })
    );
  }

  if (input.annotatedScreenshotBlob && input.annotatedScreenshotBlob.size > 0) {
    uploadPromises.push(
      uploadScreenshot(input.annotatedScreenshotBlob, "annotated.png", storagePath).then((url) => {
        annotatedScreenshotUrl = url;
      })
    );
  }

  if (input.cropScreenshotBlob && input.cropScreenshotBlob.size > 0) {
    uploadPromises.push(
      uploadScreenshot(input.cropScreenshotBlob, "crop.png", storagePath).then((url) => {
        cropImageUrl = url;
      })
    );
  }

  if (input.thumbnailBlob && input.thumbnailBlob.size > 0) {
    uploadPromises.push(
      uploadScreenshot(input.thumbnailBlob, "thumb.png", storagePath).then((url) => {
        thumbnailUrl = url;
      })
    );
  }

  if (uploadPromises.length > 0) {
    try {
      await Promise.all(uploadPromises);
      if (!input.thumbnailBlob) {
        thumbnailUrl = screenshotUrl !== placeholderScreenshot ? screenshotUrl : annotatedScreenshotUrl;
      }
      if (!input.screenshotBlob) {
        screenshotUrl = annotatedScreenshotUrl;
      }
    } catch (err) {
      console.warn("Screenshot upload failed, using placeholders:", err);
    }
  }

  const annotation: AnnotationCapture | undefined = input.annotation
    ? {
        pageUrl: input.annotation.pageUrl ?? "/",
        pageTitle: input.annotation.pageTitle,
        startX: input.annotation.startX ?? 0,
        startY: input.annotation.startY ?? 0,
        width: input.annotation.width,
        height: input.annotation.height,
        documentX: input.annotation.documentX ?? 0,
        documentY: input.annotation.documentY ?? 0,
        viewport: input.annotation.viewport ?? { 
          width: window.innerWidth, 
          height: window.innerHeight 
        },
        scrollPosition: input.annotation.scrollPosition ?? { x: 0, y: 0 },
        deviceMode,
        browser: browser?.browser,
        browserVersion: browser?.browserVersion,
        os: browser?.os,
        timestamp: new Date().toISOString(),
        xPercent: input.annotation.xPercent ?? 0,
        yPercent: input.annotation.yPercent ?? 0,
        widthPercent: input.annotation.widthPercent,
        heightPercent: input.annotation.heightPercent,
        annotationKind: input.annotation.annotationKind,
        domContext: input.annotation.domContext,
      }
    : undefined;

  const item: ReviewItem = {
    id: issueId,
    reviewId: input.reviewId,
    pageId,
    itemNumber: existing.length + 1,
    createdInVersion: input.createdInVersion,
    latestVersion: input.createdInVersion,
    title: input.title,
    description: input.description,
    issueType: input.issueType,
    priority: input.priority,
    status: "REQUESTED",
    createdBy: input.createdBy,
    assignedTo: input.assignedTo,
    createdAt: new Date().toISOString(),
    annotation,
    functional: input.functional,
    screenshotUrl,
    annotatedScreenshotUrl,
    cropImageUrl,
    thumbnailUrl,
  };

  const res = await fetch(`${BASE_URL}/reviewItems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("Failed to create review item");

  const created = await res.json();

  await fetch(`${BASE_URL}/reviewAttachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: id(),
      reviewItemId: created.id,
      type: "screenshot",
      url: screenshotUrl,
      thumbnailUrl,
      createdAt: new Date().toISOString(),
    }),
  });

  await logActivity({
    projectId: input.projectId,
    reviewId: input.reviewId,
    action: "Review Item Created",
    user: input.createdBy,
    userLabel: input.createdByLabel,
    metadata: {
      reviewItemId: created.id,
      itemNumber: created.itemNumber,
      issueType: input.issueType,
      priority: input.priority,
      versionNumber: input.createdInVersion,
    },
  });

  return created;
}

export async function updateReviewItem(
  itemId: string,
  data: Partial<ReviewItem>
): Promise<ReviewItem> {
  const res = await fetch(`${BASE_URL}/reviewItems/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update review item");
  return res.json();
}

export async function setReviewItemStatus(input: {
  itemId: string;
  reviewId: string;
  projectId: string;
  status: ReviewItemStatus;
  userId: string;
  userLabel: string;
  latestVersion?: number;
}): Promise<ReviewItem> {
  const prev = await getReviewItem(input.itemId);
  const patch: Partial<ReviewItem> = { status: input.status };
  if (input.latestVersion !== undefined) {
    patch.latestVersion = input.latestVersion;
  }
  const updated = await updateReviewItem(input.itemId, patch);

  const actionMap: Record<ReviewItemStatus, string> = {
    REQUESTED: "Review Item Reopened",
    WORKING: "Review Item Marked Working",
    READY_FOR_REVIEW: "Review Item Ready For Review",
    APPROVED: "Review Item Approved",
    NEEDS_MORE_WORK: "Review Item Reopened",
  };

  await logActivity({
    projectId: input.projectId,
    reviewId: input.reviewId,
    action: actionMap[input.status] ?? "Review Item Status Changed",
    user: input.userId,
    userLabel: input.userLabel,
    metadata: {
      reviewItemId: input.itemId,
      from: prev.status,
      to: input.status,
    },
  });

  return updated;
}

export async function assignReviewItem(input: {
  itemId: string;
  reviewId: string;
  projectId: string;
  assignedTo: string;
  userId: string;
  userLabel: string;
}): Promise<ReviewItem> {
  const updated = await updateReviewItem(input.itemId, {
    assignedTo: input.assignedTo,
    status: "WORKING",
  });

  await logActivity({
    projectId: input.projectId,
    reviewId: input.reviewId,
    action: "Review Item Assigned",
    user: input.userId,
    userLabel: input.userLabel,
    metadata: { reviewItemId: input.itemId, assignedTo: input.assignedTo },
  });

  return updated;
}

export async function requestChangesOnReview(input: {
  reviewId: string;
  projectId: string;
  userId: string;
  userLabel: string;
}): Promise<ReviewSession> {
  const updated = await updateReviewSession(input.reviewId, {
    status: "CHANGES_REQUESTED",
  });

  await logActivity({
    projectId: input.projectId,
    reviewId: input.reviewId,
    action: "Changes Requested",
    user: input.userId,
    userLabel: input.userLabel,
  });

  return updated;
}

export async function approveRelease(input: {
  reviewId: string;
  projectId: string;
  approvedVersion: number;
  approvedBy: string;
  approvedByLabel: string;
}): Promise<{ approval: Approval; review: ReviewSession }> {
  const approval: Approval = {
    id: id(),
    reviewId: input.reviewId,
    approvedVersion: input.approvedVersion,
    approvedBy: input.approvedBy,
    approvedAt: new Date().toISOString(),
  };

  const approvalRes = await fetch(`${BASE_URL}/approvals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(approval),
  });
  if (!approvalRes.ok) throw new Error("Failed to create approval");

  const review = await updateReviewSession(input.reviewId, { status: "APPROVED" });

  await logActivity({
    projectId: input.projectId,
    reviewId: input.reviewId,
    action: "Release Approved",
    user: input.approvedBy,
    userLabel: input.approvedByLabel,
    metadata: { approvedVersion: input.approvedVersion },
  });

  return { approval: await approvalRes.json(), review };
}

// ——— Comments ———

export async function getReviewComments(reviewItemId: string): Promise<ReviewComment[]> {
  const res = await fetch(
    `${BASE_URL}/reviewComments?reviewItemId=${reviewItemId}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

export async function createReviewComment(input: {
  reviewItemId: string;
  reviewId: string;
  text: string;
  authorId: string;
  authorName: string;
}): Promise<ReviewComment> {
  const comment: ReviewComment = {
    id: id(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  const res = await fetch(`${BASE_URL}/reviewComments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(comment),
  });
  if (!res.ok) throw new Error("Failed to create comment");
  return res.json();
}

// ——— Attachments ———

export async function getReviewAttachments(
  reviewItemId: string
): Promise<ReviewAttachment[]> {
  const res = await fetch(
    `${BASE_URL}/reviewAttachments?reviewItemId=${reviewItemId}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch attachments");
  return res.json();
}

// ——— Users ———

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

// ——— Approvals ———

export async function getApprovals(reviewId: string): Promise<Approval[]> {
  const res = await fetch(`${BASE_URL}/approvals?reviewId=${reviewId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch approvals");
  return res.json();
}

// Legacy adapter for website proofing viewer (maps review items → comment shape)
export type AnnotationKind = "pin" | "rectangle" | "arrow";

export interface LegacyComment {
  id: string;
  reviewId: string;
  text: string;
  type: "website" | "annotation" | "general";
  annotationKind?: AnnotationKind;
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  endXPercent?: number;
  endYPercent?: number;
  resolved: boolean;
  author: "agency" | "client";
  authorEmail?: string;
  authorName?: string;
  pinNumber?: number;
  priority?: "low" | "medium" | "high" | "critical";
  websiteAnchor?: {
    selector: string;
    pageUrl: string;
    scrollPosition: { x: number; y: number };
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
    deviceType: "desktop" | "laptop" | "tablet" | "mobile" | "custom";
    offsetWithinElement?: { xPercent: number; yPercent: number };
  };
}

export function reviewItemsToLegacyComments(
  items: ReviewItem[],
  reviewId: string
): LegacyComment[] {
  return items
    .filter((i) => i.annotation)
    .map((item) => {
      const a = item.annotation!;
      const priority = item.priority.toLowerCase() as LegacyComment["priority"];
      return {
        id: item.id,
        reviewId,
        text: item.description,
        type: "website" as const,
        annotationKind: a.annotationKind ?? "pin",
        xPercent: a.xPercent,
        yPercent: a.yPercent,
        widthPercent: a.widthPercent,
        heightPercent: a.heightPercent,
        resolved: item.status === "APPROVED",
        author: "agency" as const,
        pinNumber: item.itemNumber,
        priority,
        websiteAnchor: {
          selector: a.domContext?.elementId ? `#${a.domContext.elementId}` : "",
          pageUrl: a.pageUrl,
          scrollPosition: a.scrollPosition ?? { x: 0, y: 0 },
          x: a.documentX,
          y: a.documentY,
          viewportWidth: a.viewport.width,
          viewportHeight: a.viewport.height,
          deviceType: a.deviceMode.toLowerCase() as "desktop" | "laptop" | "tablet" | "mobile",
        },
      };
    });
}
