import type { ReviewDashboardStats } from "@/lib/types";

export function ReleaseReadinessBar({ stats }: { stats: ReviewDashboardStats }) {
  const pct = stats.readinessPercent;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-700">Release readiness</span>
        <span className="font-bold text-indigo-600">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span>{stats.total} total</span>
        <span className="text-emerald-700">{stats.approved} approved</span>
        <span className="text-amber-700">{stats.awaitingValidation} awaiting validation</span>
        <span>{stats.open} open</span>
        {stats.needsMoreWork > 0 && (
          <span className="text-rose-700">{stats.needsMoreWork} needs more work</span>
        )}
      </div>
    </div>
  );
}
