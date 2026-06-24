import React from 'react';
import { Plus, ChevronRight, MapPin, Eye, EyeOff, CheckCircle2, Sparkles } from 'lucide-react';

interface SlimBarProps {
  onAction: (action: string) => void;
  activeAction?: string;
  showOverlays?: boolean;
  issueCount?: number;
  isAuthenticated?: boolean;
}

const SlimBar: React.FC<SlimBarProps> = ({ onAction, activeAction, showOverlays, issueCount = 0, isAuthenticated = false }) => {
  return (
    <div className="w-16 h-full bg-[#002B49] flex flex-col items-center py-8 gap-6 text-white shadow-xl z-50">
      {/* Logo Area */}
      <div className="mb-6 relative">
        <div className="text-2xl font-black tracking-tighter">Q.</div>
        {isAuthenticated && (
          <div className="absolute -right-2 -bottom-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#002B49] flex items-center justify-center">
            <CheckCircle2 size={10} className="text-white" />
          </div>
        )}
      </div>

      {/* Task Count / Navigation */}
      <div 
        className="flex flex-col items-center gap-2 group cursor-pointer relative" 
        onClick={() => onAction('view_tasks')}
      >
        <div className={`p-3 rounded-xl transition-all relative ${
          activeAction === 'view_tasks' 
            ? 'bg-white/10 text-white' 
            : 'hover:bg-white/10 text-slate-300'
        }`} style={{
          borderLeft: activeAction === 'view_tasks' ? '3px solid #8b5cf6' : '3px solid transparent'
        }}>
          <MapPin size={22} />
          {issueCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#002B49]">
              {issueCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tasks</span>
      </div>

      {/* Issues Toggle */}
      <div 
        className="flex flex-col items-center gap-2"
      >
        <button 
          onClick={() => onAction('toggle_overlays')}
          title={showOverlays ? "Hide existing issues" : "Show existing issues"}
          className={`p-3 rounded-xl transition-all relative group ${
            showOverlays 
              ? 'bg-white/10 text-white' 
              : 'hover:bg-white/10 text-slate-300'
          }`} style={{
            borderLeft: showOverlays ? '3px solid #8b5cf6' : '3px solid transparent'
          }}
        >
          {showOverlays ? <Eye size={22} /> : <EyeOff size={22} />}
          {issueCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#002B49]">
              {issueCount}
            </span>
          )}
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Issues</span>
      </div>

      {/* New Issue Button */}
      <div className="flex flex-col items-center gap-2">
        <button 
          onClick={() => onAction('new_issue')}
          className={`p-3 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg transition-all transform hover:scale-105 ${
            activeAction === 'new_issue' ? 'ring-2 ring-white/30' : ''
          }`}
        >
          <Plus size={24} strokeWidth={3} className="text-white" />
        </button>
      </div>

      {/* Coming Soon Video Feature */}
      <div className="flex flex-col items-center gap-1.5 opacity-70">
        <div className="p-3 rounded-xl bg-white/5 cursor-not-allowed">
          <Sparkles size={20} className="text-slate-400" />
        </div>
        <span className="text-[8px] font-semibold text-slate-500 bg-slate-800/70 px-2 py-0.5 rounded-full">Soon</span>
      </div>

      {/* Bottom Close/Toggle */}
      <div className="mt-auto">
        <button 
          onClick={() => onAction('toggle_panel')}
          className="p-3 rounded-xl hover:bg-white/10 text-slate-300 transition-all hover:translate-x-1"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default SlimBar;
