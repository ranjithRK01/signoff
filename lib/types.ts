export type ReviewSessionStatus = "IN_REVIEW" | "CHANGES_REQUESTED" | "APPROVED";
export type ReviewType = "website";
export type IssueType = "VISUAL" | "FUNCTIONAL" | "CONTENT" | "GENERAL";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ReviewItemStatus =
  | "REQUESTED"
  | "WORKING"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "NEEDS_MORE_WORK";

export type DeviceMode = "Desktop" | "Laptop" | "Tablet" | "Mobile";

export interface Project {
  _id?: string;
  id: string;
  name: string;
  url: string;
  domain: string;
  ownerId: string;
  currentVersion: string;
  description?: string;
  createdAt: string;
  invitedEmails?: string[];
  clientEmail: string;
}

export interface ReviewSession {
  id: string;
  projectId: string;
  title: string;
  reviewType: ReviewType;
  status: ReviewSessionStatus;
  currentVersionId: string;
  createdBy: string;
  createdAt: string;
}

export interface Version {
  id: string;
  reviewId: string;
  versionNumber: number;
  liveUrl: string;
  submittedBy: string;
  submittedAt: string;
  notes?: string;
  mockVariant?: 1 | 2;
}

export interface AnnotationCapture {
  pageUrl: string;
  pageTitle?: string;
  /** Viewport-relative start X at time of capture */
  startX: number;
  /** Viewport-relative start Y at time of capture */
  startY: number;
  /** Viewport-relative width */
  width?: number;
  /** Viewport-relative height */
  height?: number;
  /** Document-relative X (scrollX + startX) */
  documentX: number;
  /** Document-relative Y (scrollY + startY) */
  documentY: number;
  /** Viewport size at capture */
  viewport: { width: number; height: number };
  /** Scroll position at capture */
  scrollPosition: { x: number; y: number };
  
  deviceMode: DeviceMode;
  browser?: string;
  browserVersion?: string;
  os?: string;
  timestamp: string;
  
  xPercent: number;
  yPercent: number;
  widthPercent?: number;
  heightPercent?: number;
  
  annotationKind?: "pin" | "rectangle" | "arrow";
  domContext?: {
    tagName: string;
    elementText?: string;
    elementId?: string;
    elementClasses?: string[];
  };
}

export interface PageRegistry {
  id: string;
  reviewId: string;
  pageUrl: string;
  pageTitle: string;
  routePattern?: string;
}

export interface ReviewItem {
  id: string;
  reviewId: string;
  pageId?: string; // Link to PageRegistry
  itemNumber: number;
  createdInVersion: number;
  latestVersion: number;
  title: string;
  description: string;
  issueType: IssueType;
  priority: Priority;
  status: ReviewItemStatus;
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  annotation?: AnnotationCapture;
  functional?: FunctionalDetails;
  screenshotUrl?: string;
  annotatedScreenshotUrl?: string;
  cropImageUrl?: string;
  thumbnailUrl?: string;
}

export interface ReviewComment {
  id: string;
  reviewItemId: string;
  reviewId: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface ReviewAttachment {
  id: string;
  reviewItemId: string;
  type: "screenshot" | "annotated" | "pin";
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  reviewId: string;
  approvedVersion: number;
  approvedBy: string;
  approvedAt: string;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  reviewId: string;
  action: string;
  user: string;
  userLabel: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "developer" | "reviewer" | "admin";
}

export interface ReviewDashboardStats {
  total: number;
  approved: number;
  awaitingValidation: number;
  open: number;
  needsMoreWork: number;
  readinessPercent: number;
}
