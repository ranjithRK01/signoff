import React from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { ReviewItem } from '../lib/types';

interface IssueListProps {
  issues: ReviewItem[];
  filterByPage?: string;
  onSelectIssue: (issue: ReviewItem) => void;
}

const IssueList: React.FC<IssueListProps> = ({ issues, filterByPage, onSelectIssue }) => {
  // Using pageUrl instead of pathname to match ReviewItem interface
  const filteredIssues = issues.filter(i => !filterByPage || i.pageUrl?.includes(filterByPage));

  if (filteredIssues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p className="text-sm italic">No tasks found for this view</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredIssues.map((issue) => (
        <div 
          key={issue._id || issue.id}
          onClick={() => onSelectIssue(issue)}
          className="p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
              {issue.title || issue.description}
            </h3>
            <StatusIcon status={issue.status} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${getPriorityClass(issue.severity)}`}>
              {issue.severity}
            </span>
            <span className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">
              {new Date(issue.createdAt as any).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status.toUpperCase()) {
    case 'OPEN': return <AlertCircle size={14} className="text-rose-500" />;
    case 'IN_PROGRESS': return <Clock size={14} className="text-amber-500" />;
    case 'RESOLVED': return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'VALIDATED': return <CheckCircle2 size={14} className="text-indigo-500" />;
    default: return null;
  }
};

const getPriorityClass = (severity: string) => {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 'bg-rose-100 text-rose-600';
    case 'HIGH': return 'bg-orange-100 text-orange-600';
    case 'MEDIUM': return 'bg-amber-100 text-amber-600';
    case 'LOW': return 'bg-emerald-100 text-emerald-600';
    default: return 'bg-slate-100 text-slate-600';
  }
};

export default IssueList;
