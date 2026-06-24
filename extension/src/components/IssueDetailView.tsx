import React from 'react';
import { ChevronLeft, CheckCircle2, Globe } from 'lucide-react';
import { ReviewItem } from '../lib/types';

interface IssueDetailViewProps {
  issue: ReviewItem;
  onClose: () => void;
}

const IssueDetailView: React.FC<IssueDetailViewProps> = ({ issue, onClose }) => {
  const displayId = (issue._id || issue.id || '').slice(-4).toUpperCase();
  
  const statusConfig = {
    OPEN: { label: 'Open', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    VALIDATED: { label: 'Validated', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' }
  };
  const status = (issue.status || 'OPEN').toUpperCase() as keyof typeof statusConfig;
  const { label, color, dot } = statusConfig[status] || statusConfig.OPEN;
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back to Issues</span>
        </button>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Issue #{displayId}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Header Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-1 flex-1">
              <h1 className="text-lg font-bold text-slate-900 leading-snug">
                {issue.title || 'Untitled Issue'}
              </h1>
              {issue.description && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {issue.description}
                </p>
              )}
            </div>
            <div className={`ml-3 px-3 py-1 rounded-full flex items-center gap-1.5 ${color}`}>
              <div className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs font-semibold">{label}</span>
            </div>
          </div>
        </div>

        {/* Screenshot */}
        {issue.screenshot && (
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <img 
              src={issue.screenshot} 
              alt="Issue screenshot" 
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assignee</div>
            <div className="text-sm font-semibold text-slate-800">{issue.assignee || 'Unassigned'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Severity</div>
            <div className="text-sm font-semibold text-slate-800">{issue.severity || 'MEDIUM'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Version</div>
            <div className="text-sm font-semibold text-slate-800">{issue.versionId || '1.0.0'}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Created</div>
            <div className="text-sm font-semibold text-slate-800">
              {new Date(issue.createdAt as any).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Page Context */}
        {(issue.pageUrl || issue.pageTitle) && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Globe size={12} />
              <span>Context</span>
            </div>
            {issue.pageUrl && (
              <a 
                href={issue.pageUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="block text-sm text-blue-600 hover:underline break-all bg-slate-50 p-2 rounded-lg border border-slate-100"
              >
                {issue.pageUrl}
              </a>
            )}
            {issue.pageTitle && (
              <p className="text-sm text-slate-600">{issue.pageTitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
        <select 
          className="flex-1 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 px-3 py-2.5 outline-none"
          defaultValue={status}
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="VALIDATED">Validated</option>
        </select>
        <button 
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg py-2.5 px-4 transition-all shadow-sm active:scale-[0.98] text-sm"
          onClick={() => {/* Handle mark fixed */}}
        >
          <CheckCircle2 size={16} />
          <span>Mark Fixed</span>
        </button>
      </div>
    </div>
  );
};

export default IssueDetailView;
