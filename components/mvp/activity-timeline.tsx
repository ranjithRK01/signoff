"use client";

import { useEffect, useState } from "react";
import { getActivityLogs } from "@/lib/activityLog";
import type { ActivityLog } from "@/lib/types";

export function ActivityTimeline({
  projectId,
  reviewId,
}: {
  projectId: string;
  reviewId: string;
}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    getActivityLogs(projectId, reviewId).then(setLogs).catch(() => setLogs([]));
  }, [projectId, reviewId]);

  if (logs.length === 0) {
    return <p className="text-xs text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="relative pl-4 border-l-2 border-zinc-200">
          <p className="text-xs font-semibold text-zinc-800">{log.action}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {log.userLabel} · {new Date(log.timestamp).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
