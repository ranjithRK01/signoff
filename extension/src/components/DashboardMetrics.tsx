import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

import { ReviewItem } from '../lib/types';

interface DashboardMetricsProps {
  issues: ReviewItem[];
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ issues }) => {
  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'OPEN').length,
    inProgress: issues.filter(i => i.status === 'IN_PROGRESS').length,
    closed: issues.filter(i => i.status === 'RESOLVED' || i.status === 'VALIDATED').length,
  };
  return (
    <div className="flex items-center gap-2 mb-4 px-4">
      <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
        <div className="text-xs font-bold text-slate-500">Open</div>
        <div className="text-lg font-black text-rose-600">{stats.open}</div>
      </div>
      <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
        <div className="text-xs font-bold text-slate-500">Active</div>
        <div className="text-lg font-black text-amber-600">{stats.inProgress}</div>
      </div>
      <div className="flex-1 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
        <div className="text-xs font-bold text-slate-500">Closed</div>
        <div className="text-lg font-black text-emerald-600">{stats.closed}</div>
      </div>
    </div>
  );
};

export default DashboardMetrics;
