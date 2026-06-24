import React, { useState } from 'react';
import { Save, X, AlertTriangle, Camera, Edit3, CheckCircle2, Loader2 } from 'lucide-react';
import { createIssue } from '../lib/api';

interface IssueFormProps {
  screenshot: string | null;
  pageInfo: {
    url: string;
    pathname: string;
    title: string;
  };
  projectName?: string;
  projectId?: string;
  token?: string;
  elementRect?: { x: number, y: number, width: number, height: number } | null;
  elementInfo?: any;
  browser?: any;
  os?: string;
  viewport?: any;
  scrollPosition?: any;
  devicePixelRatio?: number;
  initialTitle?: string;
  initialDescription?: string;
  initialSeverity?: string;
  initialAssignee?: string;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (desc: string) => void;
  onSeverityChange?: (severity: string) => void;
  onAssigneeChange?: (assignee: string) => void;
  onStartAnnotate: () => void;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const IssueForm: React.FC<IssueFormProps> = ({ 
  screenshot, 
  pageInfo, 
  projectName, 
  projectId,
  token,
  elementRect,
  elementInfo,
  browser,
  os,
  viewport,
  scrollPosition,
  devicePixelRatio,
  initialTitle = '',
  initialDescription = '',
  initialSeverity = 'MEDIUM',
  initialAssignee = '',
  onTitleChange,
  onDescriptionChange,
  onSeverityChange,
  onAssigneeChange,
  onStartAnnotate, 
  onSave, 
  onCancel 
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [severity, setSeverity] = useState(initialSeverity);
  const [assignee, setAssignee] = useState(initialAssignee);
  const [isSaving, setIsSaving] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onTitleChange?.(newTitle);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDesc = e.target.value;
    setDescription(newDesc);
    onDescriptionChange?.(newDesc);
  };

  const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeverity = e.target.value;
    setSeverity(newSeverity);
    onSeverityChange?.(newSeverity);
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAssignee = e.target.value;
    setAssignee(newAssignee);
    onAssigneeChange?.(newAssignee);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!projectId || !token) {
      alert('Authentication required to save issues.');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const issueData = {
        title: title.trim(),
        description: description.trim(),
        severity,
        assignee,
        status: 'OPEN',
        screenshot: screenshot,
        pageUrl: pageInfo.url,
        pageTitle: pageInfo.title,
        pathname: pageInfo.pathname,
        versionId: '1.0.0',
        elementRect: elementRect || undefined,
        elementBoundingBox: elementRect ? {
          top: elementRect.y,
          left: elementRect.x,
          width: elementRect.width,
          height: elementRect.height,
        } : undefined,
        elementSelector: elementInfo?.selector,
        elementTag: elementInfo?.tag,
        elementId: elementInfo?.elementId,
        elementClasses: elementInfo?.elementClasses,
        elementText: elementInfo?.elementText,
        browser: browser ? { ...browser, userAgent: navigator.userAgent } : undefined,
        os,
        viewport,
        scrollPosition,
        devicePixelRatio,
      };

      const result = await createIssue(projectId, token, issueData);
      onSave(result);
    } catch (error) {
      console.error('Error saving issue:', error);
      alert('Failed to save issue.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnnotateClick = () => {
    onStartAnnotate();
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onCancel} />
      
      {/* Modal Container */}
      <div className="relative bg-white w-[780px] max-w-[90vw] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-slate-300 rounded-full" />)}
            </div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
              {projectName || "PROJECT"}
            </h2>
          </div>
          <button onClick={onCancel} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Column: Description & Screenshot */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto border-r border-slate-100">
            <div className="space-y-4">
            <div className="space-y-2">
              <input
                autoFocus
                required
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Add description"
                className="w-full p-0 text-lg border-none focus:ring-0 placeholder:text-slate-300 font-semibold"
              />
            </div>

            <div className="min-h-[140px] bg-slate-50 rounded-lg p-4 border border-slate-100 focus-within:border-blue-200 transition-colors">
              <textarea
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Detailed notes..."
                className="w-full h-full bg-transparent text-sm border-none focus:ring-0 resize-none p-0 placeholder:text-slate-400"
              />
              <div className="text-[10px] text-slate-400 mt-2 text-right uppercase font-bold tracking-wider">
                {description.length} / 2000
              </div>
            </div>
          </div>

            {/* Screenshot Area */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video shadow-inner">
              {screenshot ? (
                <>
                  <img src={screenshot} alt="Capture" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 text-white text-[10px] font-bold mb-3 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <CheckCircle2 size={14} className="text-green-400" />
                      <span>SCREENSHOT CAPTURED</span>
                    </div>
                    <button 
                      type="button"
                      onClick={handleAnnotateClick}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-lg text-xs font-bold shadow-2xl hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <Edit3 size={16} />
                      <span>ANNOTATE</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <Camera size={32} className="text-slate-700" />
                  <button
                    type="button"
                    onClick={onStartAnnotate}
                    className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    Capture Evidence
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Meta Fields */}
          <div className="w-[280px] bg-slate-50/50 p-6 flex flex-col gap-5">
            <div className="space-y-4 flex-1">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Assignee(s)</label>
          <select 
            value={assignee}
            onChange={handleAssigneeChange}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:border-blue-400 transition-colors shadow-sm"
          >
            <option value="">Unassigned</option>
            <option value="user-1">Ranjith</option>
            <option value="user-2">Team Member</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Severity</label>
          <select 
            value={severity}
            onChange={handleSeverityChange}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:border-blue-400 transition-colors shadow-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Status</label>
                <select className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:border-blue-400 transition-colors shadow-sm">
                  <option>Backlog</option>
                  <option>Next Sprint</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tag(s)</label>
                <input 
                  type="text" 
                  placeholder="Add tags..." 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 outline-none focus:border-blue-400 transition-colors shadow-sm" 
                />
              </div>

              <div className="flex items-center gap-2 px-1 mt-4">
                <input type="checkbox" id="keep-settings" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="keep-settings" className="text-xs text-slate-500 font-medium">Keep these settings</label>
              </div>
            </div>
            
            <div className="pt-4 space-y-4">
              <button
                disabled={isSaving}
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  'Create task'
                )}
              </button>
              
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold justify-center tracking-tight">
                <AlertTriangle size={12} className="text-slate-300" />
                <span className="uppercase">Metadata captured automatically</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueForm;
