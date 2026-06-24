import type { ActivityLog } from "@/lib/types";

import { API_BASE_URL } from "@/lib/config";

const BASE_URL = API_BASE_URL;

export async function getActivityLogs(
  projectId: string,
  reviewId?: string
): Promise<ActivityLog[]> {
  let url = `${BASE_URL}/activityLogs?projectId=${projectId}`;
  if (reviewId) url += `&reviewId=${reviewId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch activity logs");
  const logs: ActivityLog[] = await res.json();
  return logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function logActivity(
  data: Omit<ActivityLog, "id" | "timestamp">
): Promise<ActivityLog> {
  const payload = {
    ...data,
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
  };
  const res = await fetch(`${BASE_URL}/activityLogs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create activity log");
  return res.json();
}
