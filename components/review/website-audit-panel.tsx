"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { getAuditEvents, type AuditEvent } from "@/lib/audit";

type WebsiteAuditPanelProps = {
  projectId: string;
  reviewId: string;
  refreshKey?: number;
};

const ACTION_LABELS: Record<string, string> = {
  version_uploaded: "Version uploaded",
  comment_added: "Comment added",
  comment_resolved: "Comment resolved",
  reviewer_approved: "Reviewer approved",
  reviewer_rejected: "Reviewer rejected",
  website_submitted: "Website submitted",
};

export function WebsiteAuditPanel({ projectId, reviewId, refreshKey = 0 }: WebsiteAuditPanelProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getAuditEvents(projectId, reviewId);
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, reviewId, refreshKey]);

  return (
    <div className="border-t border-border bg-zinc-50/50">
      <div className="px-4 py-2 flex items-center gap-1.5 border-b border-border">
        <History className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-wide">
          Audit trail
        </span>
      </div>
      <div className="max-h-36 overflow-y-auto px-4 py-2 space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-[10px] text-muted-foreground py-2">No events yet.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="text-[10px] border-l-2 border-indigo-200 pl-2 py-0.5">
              <p className="font-semibold text-zinc-800">
                {ACTION_LABELS[ev.action] ?? ev.action}
              </p>
              <p className="text-muted-foreground">
                {ev.actorLabel} · {new Date(ev.timestamp).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
