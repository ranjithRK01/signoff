export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
  invitedEmails?: string[]; // Multiple invited reviewer email addresses
}

export interface ReviewVersion {
  version: number;
  fileData?: string;
  url?: string;
  createdAt: string;
  note?: string;
}

export interface Review {
  id: string;
  projectId: string;
  title: string;
  type: 'video' | 'image';
  url?: string;         // for video
  fileData?: string;    // current version asset (image URL)
  status: 'pending' | 'approved' | 'revision';
  createdAt: string;
  versions?: ReviewVersion[];
  currentVersion?: number;
}

export type AnnotationKind = 'pin' | 'rectangle' | 'arrow';

export interface Comment {
  id: string;
  reviewId: string;
  text: string;
  type: 'annotation' | 'general';
  annotationKind?: AnnotationKind;
  xPercent?: number;    // pin center, rectangle top-left, or arrow start
  yPercent?: number;
  widthPercent?: number;  // rectangle width
  heightPercent?: number; // rectangle height
  endXPercent?: number;   // arrow end
  endYPercent?: number;
  timestamp?: number;   // for video timestamp in seconds
  timestampLabel?: string; // e.g., "0:12"
  resolved: boolean;
  author: 'agency' | 'client';
  authorEmail?: string; // Email of reviewer leaving comment
  authorName?: string;  // Name of reviewer leaving comment
  pinNumber?: number;   // annotation pin sequential number
  versionNumber?: number; // which file version this comment belongs to
  createdAt: string;
}

import { normalizeVersions } from "@/lib/reviewVersions";

const BASE_URL = 'http://localhost:3001';

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE_URL}/projects`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
  const newProject = {
    ...data,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    invitedEmails: data.invitedEmails || [],
  };
  const res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProject),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch project ${id}`);
  return res.json();
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update project ${id}`);
  return res.json();
}

export async function getReviews(projectId: string): Promise<Review[]> {
  const res = await fetch(`${BASE_URL}/reviews?projectId=${projectId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch reviews for project ${projectId}`);
  return res.json();
}

export async function getReview(id: string): Promise<Review> {
  const res = await fetch(`${BASE_URL}/reviews/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch review ${id}`);
  return res.json();
}

export async function createReview(data: Omit<Review, 'id' | 'status' | 'createdAt'>): Promise<Review> {
  const newReview = {
    ...data,
    id: Math.random().toString(36).substring(2, 9),
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };
  const res = await fetch(`${BASE_URL}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newReview),
  });
  if (!res.ok) throw new Error('Failed to create review');
  return res.json();
}

export async function updateReview(id: string, data: Partial<Review>): Promise<Review> {
  const res = await fetch(`${BASE_URL}/reviews/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update review ${id}`);
  return res.json();
}

export async function addReviewVersion(
  reviewId: string,
  payload: { fileData?: string; url?: string; note?: string }
): Promise<Review> {
  const review = await getReview(reviewId);
  const versions = normalizeVersions(review);
  const nextVersion = versions.length + 1;

  const newEntry: ReviewVersion = {
    version: nextVersion,
    fileData: payload.fileData,
    url: payload.url,
    createdAt: new Date().toISOString(),
    note: payload.note,
  };

  const updatedVersions = [...versions, newEntry];

  return updateReview(reviewId, {
    versions: updatedVersions,
    currentVersion: nextVersion,
    fileData: payload.fileData ?? review.fileData,
    url: payload.url ?? review.url,
    status: "pending",
  });
}

export async function getComments(reviewId: string): Promise<Comment[]> {
  const res = await fetch(`${BASE_URL}/comments?reviewId=${reviewId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch comments for review ${reviewId}`);
  return res.json();
}

export async function createComment(data: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
  const newComment = {
    ...data,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };
  const res = await fetch(`${BASE_URL}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newComment),
  });
  if (!res.ok) throw new Error('Failed to create comment');
  return res.json();
}

export async function updateComment(id: string, data: Partial<Comment>): Promise<Comment> {
  const res = await fetch(`${BASE_URL}/comments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update comment ${id}`);
  return res.json();
}
