"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Globe, Plus, Loader2, Search, ExternalLink, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getProject, type Project } from "@/lib/api";

type FilterStatus = 'All' | 'Open' | 'In Progress' | 'Resolved';

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };

  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const proj = await getProject(id);
      
      // Fetch issues for this project
      const res = await fetch(`/api/projects/${id}/issues`);
      if (res.ok) {
        const issuesData = await res.json();
        setIssues(issuesData);
      }

      setProject(proj);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load project details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesStatus = filter === 'All' || issue.status === filter;
    const matchesSearch = !searchQuery || 
      (issue.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (issue.pageUrl?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (issue.title?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const openCount = issues.filter(i => i.status === 'Open').length;
  const inProgressCount = issues.filter(i => i.status === 'In Progress').length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved' || i.status === 'Validated').length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-50 text-red-700 border-red-200';
      case 'In Progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resolved':
      case 'Validated': return 'bg-green-50 text-green-700 border-green-200';
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

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <Link href="/projects" className="text-xs font-bold text-zinc-400 hover:text-indigo-500 uppercase tracking-widest transition-colors">
               Projects
             </Link>
             <span className="text-zinc-300">/</span>
             <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{project.name}</span>
          </div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-4 mt-2">
            <a 
              href={project.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm font-medium text-zinc-500 hover:text-indigo-500 flex items-center gap-1.5 transition-colors"
            >
              <Globe size={14} />
              {project.domain}
              <ExternalLink size={12} />
            </a>
            <div className="h-4 w-[1px] bg-zinc-200" />
            <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
              <Calendar size={14} />
              Created {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 px-6 shadow-lg shadow-indigo-100">
             <Plus size={18} className="mr-2" /> New Issue
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {[
           { label: 'Total Issues', value: issues.length, icon: Search, color: 'text-zinc-900', bg: 'bg-zinc-50' },
           { label: 'Open', value: openCount, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
           { label: 'In Progress', value: inProgressCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
           { label: 'Resolved', value: resolvedCount, icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50' },
         ].map((stat, i) => (
           <div key={i} className={`${stat.bg} p-5 rounded-xl border border-zinc-100`}>
              <div className="flex items-center justify-between mb-3">
                 <stat.icon size={20} className={stat.color} />
                 <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-sm font-semibold text-zinc-600">{stat.label}</p>
           </div>
         ))}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
          {(['All', 'Open', 'In Progress', 'Resolved'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === status 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative flex-1 md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search issues..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-100 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
          <div className="col-span-4">Issue</div>
          <div className="col-span-3">URL</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        
        <div className="divide-y divide-zinc-100">
           {filteredIssues.length === 0 ? (
             <div className="p-16 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-100">
                   <AlertCircle className="text-zinc-300" size={32} />
                </div>
                <h4 className="font-semibold text-zinc-900 mb-1">No issues found</h4>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                   {searchQuery ? 'Try adjusting your search or filters.' : 'Open your project URL with the Signoff.AI extension to start raising issues.'}
                </p>
             </div>
           ) : (
             filteredIssues.map((issue) => (
               <Link
                key={issue._id}
                href={`/projects/${id}/issues/${issue._id}`}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors group cursor-pointer items-center"
               >
                  {/* Issue */}
                  <div className="col-span-4">
                    <div className="flex items-start gap-3">
                      {issue.screenshot && (
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden shrink-0">
                          <img src={issue.screenshot} alt="Issue" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-zinc-900 text-sm group-hover:text-indigo-600 transition-colors truncate">
                          {issue.title || issue.description}
                        </h4>
                        {issue.assignee && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] text-indigo-600 font-bold">
                              {issue.assignee[0].toUpperCase()}
                            </div>
                            <span className="text-xs text-zinc-500">{issue.assignee}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* URL */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 truncate">
                      <Globe size={12} />
                      <span className="truncate">{issue.pageUrl}</span>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="col-span-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getSeverityStyle(issue.severity)}`}>
                      {issue.severity || 'MEDIUM'}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-sm text-zinc-500">
                    {new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  {/* Status */}
                  <div className="col-span-1 text-right">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusStyle(issue.status)}`}>
                      {issue.status || 'OPEN'}
                    </span>
                  </div>
               </Link>
             ))
           )}
        </div>
      </div>
    </div>
  );
}
