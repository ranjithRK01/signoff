"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  Globe, 
  ArrowLeft, 
  Loader2, 
  ExternalLink, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Monitor,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

export default function IssueDetailPage() {
  const { id: projectId, issueId } = useParams() as { id: string; issueId: string };
  const router = useRouter();

  const [issue, setIssue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIssue = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/issues/${issueId}`);
      if (!res.ok) throw new Error('Failed to fetch issue');
      const data = await res.json();
      setIssue(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load issue details');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, issueId]);

  useEffect(() => {
    if (projectId && issueId) {
      fetchIssue();
    }
  }, [projectId, issueId, fetchIssue]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <AlertCircle className="h-16 w-16 text-zinc-400 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-800 mb-2">Issue not found</h2>
        <Link href={`/projects/${projectId}`} className="text-indigo-600 font-medium hover:underline">
          Back to project
        </Link>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-50 text-red-700 border-red-200';
      case 'IN_PROGRESS': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
      case 'VALIDATED': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'LOW': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle size={18} />;
      case 'IN_PROGRESS': return <Clock size={18} />;
      case 'RESOLVED':
      case 'VALIDATED': return <CheckCircle2 size={18} />;
      default: return <AlertCircle size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Issue Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issue Header */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(issue.status)}
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
                      {issue.title || 'Untitled Issue'}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getSeverityStyle(issue.severity)}`}>
                    {issue.severity || 'MEDIUM'}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${getStatusStyle(issue.status)}`}>
                    {issue.status || 'OPEN'}
                  </span>
                </div>
              </div>

              {issue.description && (
                <p className="text-zinc-600 leading-relaxed">
                  {issue.description}
                </p>
              )}
            </div>

            {/* Screenshot */}
            {(issue.screenshot || issue.annotatedScreenshot) && (
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50">
                  <h3 className="text-sm font-semibold text-zinc-700">Screenshot</h3>
                </div>
                <div className="p-6">
                  <img
                    src={issue.annotatedScreenshot || issue.screenshot}
                    alt="Issue screenshot"
                    className="w-full h-auto rounded-xl border border-zinc-200 shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Page Context */}
            {(issue.pageUrl || issue.pageTitle) && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Globe size={18} className="text-zinc-500" />
                  <h3 className="text-sm font-semibold text-zinc-700">Page Context</h3>
                </div>
                <div className="space-y-3">
                  {issue.pageUrl && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">URL</p>
                      <a
                        href={issue.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline break-all flex items-center gap-1"
                      >
                        {issue.pageUrl}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {issue.pageTitle && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Page Title</p>
                      <p className="text-sm text-zinc-700">{issue.pageTitle}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Metadata Sidebar */}
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-700 mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Created</p>
                  <div className="flex items-center gap-2 text-sm text-zinc-700">
                    <Calendar size={16} />
                    {new Date(issue.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {issue.assignee && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Assignee</p>
                    <div className="flex items-center gap-2 text-sm text-zinc-700">
                      <User size={16} />
                      {issue.assignee}
                    </div>
                  </div>
                )}

                {issue.versionId && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Version</p>
                    <p className="text-sm text-zinc-700">{issue.versionId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Environment Info */}
            {(issue.browser || issue.os || issue.viewport) && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-700 mb-4">Environment</h3>
                <div className="space-y-4">
                  {issue.browser && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Browser</p>
                      <p className="text-sm text-zinc-700">
                        {issue.browser.name} {issue.browser.version}
                      </p>
                    </div>
                  )}
                  {issue.os && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">OS</p>
                      <p className="text-sm text-zinc-700">{issue.os}</p>
                    </div>
                  )}
                  {issue.viewport && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Viewport</p>
                      <div className="flex items-center gap-2 text-sm text-zinc-700">
                        {issue.viewport.width >= 1024 ? <Monitor size={16} /> : <Smartphone size={16} />}
                        {issue.viewport.width} × {issue.viewport.height}
                      </div>
                    </div>
                  )}
                  {issue.devicePixelRatio && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Device Pixel Ratio</p>
                      <p className="text-sm text-zinc-700">{issue.devicePixelRatio}x</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}