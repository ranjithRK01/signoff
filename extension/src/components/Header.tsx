import React from 'react';
import { Project } from '../lib/types';
import { ChevronDown } from 'lucide-react';

interface HeaderProps {
  user: any;
  project?: Project;
}

const Header: React.FC<HeaderProps> = ({ user, project }) => {
  return (
    <div className="p-4 border-b border-slate-100 bg-white">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 group cursor-pointer">
           <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-sm">Q</div>
           <span className="font-bold text-slate-900 text-sm">QuickQA</span>
        </div>

        <div className="flex items-center gap-2">
           <div className="text-right">
              <p className="text-[10px] font-black text-slate-900 leading-none">{user?.name || 'User'}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Reviewer</p>
           </div>
           <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {user?.name?.[0] || 'U'}
                </div>
              )}
           </div>
           <ChevronDown size={12} className="text-slate-300" />
        </div>
      </div>

      {project && (
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
           <h2 className="text-xs font-black text-slate-900 truncate mb-1">{project.name}</h2>
           <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                Version {project.currentVersion}
              </span>
           </div>
        </div>
      )}
    </div>
  );
};

export default Header;
