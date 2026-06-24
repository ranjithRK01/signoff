export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "VALIDATED";

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
}

export interface ReviewItem {
  _id?: string;
  id?: string;
  projectId: string;
  userId: string;
  title: string;
  description?: string;
  severity: Priority;
  status: IssueStatus;
  assignee?: string;
  screenshot?: string;
  annotatedScreenshot?: string;
  elementSelector?: string;
  elementBoundingBox?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  pageUrl?: string;
  pageTitle?: string;
  versionId?: string;
  createdAt: string;
}
