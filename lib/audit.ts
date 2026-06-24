export interface AuditEvent {
  id: string;
  projectId: string;
  reviewId?: string;
  entityType: "asset" | "website_version" | "comment" | "approval" | "project";
  entityId: string;
  actorId: string;
  actorLabel: string;
  action: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

import { API_BASE_URL } from "@/lib/config";

const BASE_URL = API_BASE_URL;

export async function getAuditEvents(projectId: string, reviewId?: string): Promise<AuditEvent[]> {
  let url = `${BASE_URL}/auditEvents?projectId=${projectId}`;
  if (reviewId) url += `&reviewId=${reviewId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch audit events");
  const events: AuditEvent[] = await res.json();
  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function createAuditEvent(
  data: Omit<AuditEvent, "id" | "timestamp">
): Promise<AuditEvent> {
  const payload = {
    ...data,
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
  };
  const res = await fetch(`${BASE_URL}/auditEvents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create audit event");
  return res.json();
}
