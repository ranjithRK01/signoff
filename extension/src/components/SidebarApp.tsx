import React, { useState, useEffect } from 'react';
import Header from './Header';
import Tabs from './Tabs';
import IssueList from './IssueList';
import NewIssueButton from './NewIssueButton';
import AnnotationToolbar from './AnnotationToolbar';
import IssueForm from './IssueForm';
import IssueDetailView from './IssueDetailView';
import DashboardMetrics from './DashboardMetrics';
import SlimBar from './SlimBar';
import AnnotationEditor from './AnnotationEditor';
import { ReviewItem, Project } from '../lib/types';
import { getProjects, getIssues, verifyAuth, getAuthData, saveAuthData, clearAuthData } from '../lib/api';
import { Loader2, Globe, ArrowRight, CheckCircle2, Plus } from 'lucide-react';

const SidebarApp: React.FC = () => {
  const [panelVisible, setPanelVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');
  const [showToolbar, setShowToolbar] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ReviewItem | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [issues, setIssues] = useState<ReviewItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [elementRect, setElementRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [elementInfo, setElementInfo] = useState<any>(null);
  const [browser, setBrowser] = useState<any>(null);
  const [os, setOs] = useState<string | null>(null);
  const [viewport, setViewport] = useState<any>(null);
  const [scrollPosition, setScrollPosition] = useState<any>(null);
  const [devicePixelRatio, setDevicePixelRatio] = useState<number | null>(null);
  const [showOverlays, setShowOverlays] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState('MEDIUM');
  const [formAssignee, setFormAssignee] = useState('');
  
  const [pageInfo, setPageInfo] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hostname = params.get('hostname') || window.location.hostname;
    return {
      url: params.get('url') || window.location.href,
      hostname: hostname,
      pathname: params.get('pathname') || window.location.pathname,
      title: params.get('title') || document.title,
    };
  });

  // Load initial sidebar state
  useEffect(() => {
    chrome.storage.local.get(['sidebarVisible'], (result) => {
      if (result.sidebarVisible) {
        setPanelVisible(true);
      }
    });
  }, []);

  // 1. Initial Load: Check for stored token and user
  useEffect(() => {
    // Listen for page info updates from content script
    const handleMessage = (event: MessageEvent) => {
      if (event.data.action === 'update_page_info') {
        setPageInfo(event.data.pageInfo);
      }
    };
    window.addEventListener('message', handleMessage);

    // Use our new getAuthData helper
    const initAuth = async () => {
      const { token, user } = await getAuthData();
      if (token) {
        setToken(token);
        setUser(user);
      }
      setIsLoading(false);
    };
    initAuth();

    // Listen for storage changes (e.g. auth sync from web app)
    const handleStorageChange = (changes: any) => {
      if (changes.authToken) {
        setToken(changes.authToken.newValue);
        if (changes.user) setUser(changes.user.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // 2. Fetch projects when token or pageInfo changes
  useEffect(() => {
    if (token) {
      fetchUserProjects(token);
    }
  }, [token, pageInfo.hostname]);

  const fetchUserProjects = async (authToken: string) => {
    try {
      setIsLoading(true);
      console.log('Fetching projects with token for host:', pageInfo.hostname);
      const userProjects = await getProjects(authToken);
      console.log('Found projects:', userProjects.length);
      setProjects(userProjects);
      
      // Save user projects to chrome storage for content script to check
      chrome.storage.local.set({ userProjects: userProjects });
      
      // Match project by domain (handle www vs non-www)
      const currentHost = pageInfo.hostname.replace(/^www\./, '');
      const matched = userProjects.filter((p: Project) => {
        const projectHost = p.domain.replace(/^www\./, '');
        return projectHost === currentHost;
      });

      if (matched.length === 1) {
        setActiveProject(matched[0]);
        fetchProjectIssues(matched[0]._id || matched[0].id, authToken);
      } else if (matched.length > 1) {
        // Handle multiple projects on same domain - user selection needed
        setProjects(matched);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectIssues = async (projectId: string, authToken: string) => {
    try {
      const projectIssues = await getIssues(projectId, authToken);
      setIssues(projectIssues);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.action === 'capture_result') {
        setScreenshot(event.data.dataUrl);
        setShowForm(true);
      } else if (event.data?.action === 'location_selected') {
        setScreenshot(event.data.dataUrl);
        setElementRect(event.data.elementRect);
        setElementInfo(event.data.elementInfo);
        setBrowser(event.data.browser);
        setOs(event.data.os);
        setViewport(event.data.viewport);
        setScrollPosition(event.data.scrollPosition);
        setDevicePixelRatio(event.data.devicePixelRatio);
        setPageInfo(event.data.pageInfo);
        setShowForm(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle sidebar expansion/collapse
  useEffect(() => {
    if (!token) {
      window.parent.postMessage({ action: 'expand_sidebar' }, '*');
    } else if (showAnnotationEditor || showForm) {
      window.parent.postMessage({ action: 'expand_full' }, '*');
    } else if (panelVisible || showToolbar || selectedIssue) {
      window.parent.postMessage({ action: 'expand_sidebar' }, '*');
    } else {
      window.parent.postMessage({ action: 'collapse_sidebar' }, '*');
    }
  }, [panelVisible, showForm, showToolbar, selectedIssue, showAnnotationEditor, token]);

  const handleSlimBarAction = (action: string) => {
    if (action === 'new_issue') {
      window.parent.postMessage({ action: 'start_location_selection' }, '*');
    } else if (action === 'toggle_panel' || action === 'view_tasks') {
      const newPanelVisible = !panelVisible;
      setPanelVisible(newPanelVisible);
      chrome.storage.local.set({ sidebarVisible: newPanelVisible });
      setShowForm(false);
      setShowToolbar(false);
      setSelectedIssue(null);
    } else if (action === 'toggle_overlays') {
      setShowOverlays(!showOverlays);
    }
  };

  // Sync overlays with content script
  useEffect(() => {
    window.parent.postMessage({ 
      action: 'sync_overlays', 
      show: showOverlays, 
      issues: issues.filter(i => i.pageUrl?.includes(pageInfo.pathname)) 
    }, '*');
  }, [showOverlays, issues, pageInfo.pathname]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-white"><Loader2 className="animate-spin text-indigo-500" /></div>;
  }

  // State 1: Not logged in
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white p-6 text-center">
        <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-6">S</div>
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Sign in to continue</h2>
        <p className="text-sm text-zinc-500 mb-8">Please sign in to the Signoff.AI web app to use the extension.</p>
        <button 
          onClick={() => window.open('http://localhost:3001/sign-in', '_blank')}
          className="bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl w-full"
        >
          Sign In →
        </button>
      </div>
    );
  }

  // State 2 & 4: Logged in, but no project matched or multiple projects
  if (!activeProject) {
    const currentHost = pageInfo.hostname.replace(/^www\./, '');
    const matchedProjects = projects.filter(p => p.domain.replace(/^www\./, '') === currentHost);
    const displayProjects = matchedProjects.length > 0 ? matchedProjects : projects;
    
    return (
      <div className="flex flex-col h-screen bg-white">
        <Header user={user} />
        <div className="flex-1 p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-zinc-900">Your Projects</h2>
            <p className="text-sm text-zinc-500 mt-1">Select a project to get started</p>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {displayProjects.length > 0 ? (
              displayProjects.map(p => (
                <button 
                  key={p._id || p.id}
                  onClick={() => {
                    setActiveProject(p);
                    fetchProjectIssues(p._id || p.id, token);
                  }}
                  className="w-full p-4 border border-zinc-200 rounded-lg text-left hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-md flex items-center justify-between group transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-800 text-base truncate">{p.name}</p>
                    <p className="text-xs text-zinc-500 truncate mt-1">{p.domain}</p>
                  </div>
                  <ArrowRight size={18} className="text-zinc-300 group-hover:text-indigo-500 ml-2 shrink-0 transition-colors" />
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 text-zinc-400">
                  <Globe size={32} />
                </div>
                <p className="text-sm text-zinc-500">No projects found in your account.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 mt-auto">
            <button 
              onClick={() => window.open('http://localhost:3001/projects', '_blank')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Create Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Project matched ✅
  return (
    <div className={`flex h-full overflow-hidden ${showForm || showAnnotationEditor ? 'bg-transparent' : 'bg-white'}`}>
      <SlimBar 
        onAction={handleSlimBarAction} 
        showOverlays={showOverlays}
        issueCount={activeTab === 'current' 
          ? issues.filter(i => i.pageUrl?.includes(pageInfo.pathname)).length 
          : issues.length}
        isAuthenticated={!!token}
      />
      
      <div className={`flex-1 flex flex-col bg-white transition-all duration-300 ${panelVisible ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedIssue ? (
          <IssueDetailView 
            issue={selectedIssue} 
            onClose={() => setSelectedIssue(null)} 
          />
        ) : (
          <>
            <Header user={user} project={activeProject} />
            <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
            
            <div className="flex-1 overflow-y-auto">
              <DashboardMetrics issues={issues} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {activeTab === 'current' ? 'Current Page' : 'All Issues'}
                  </h3>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-bold rounded-full">
                    {activeTab === 'current' 
                      ? issues.filter(i => i.pageUrl?.includes(pageInfo.pathname)).length 
                      : issues.length}
                  </span>
                </div>
                
                <IssueList 
                  issues={activeTab === 'current' 
                    ? issues.filter(i => i.pageUrl?.includes(pageInfo.pathname)) 
                    : issues} 
                  onSelectIssue={setSelectedIssue}
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-100">
               <NewIssueButton onClick={() => handleSlimBarAction('new_issue')} />
            </div>
          </>
        )}
      </div>

      {/* Overlays/Modals */}
      {showToolbar && (
        <AnnotationToolbar 
          onCapture={(dataUrl) => {
            setScreenshot(dataUrl);
            setShowToolbar(false);
            setShowForm(true);
          }} 
          onCancel={() => setShowToolbar(false)}
        />
      )}

      {showForm && screenshot && (
        <IssueForm 
          screenshot={screenshot}
          pageInfo={pageInfo}
          projectName={activeProject?.name}
          projectId={activeProject?._id || activeProject?.id}
          token={token || undefined}
          elementRect={elementRect}
          elementInfo={elementInfo}
          browser={browser}
          os={os || undefined}
          viewport={viewport}
          scrollPosition={scrollPosition}
          devicePixelRatio={devicePixelRatio || undefined}
          initialTitle={formTitle}
          initialDescription={formDescription}
          initialSeverity={formSeverity}
          initialAssignee={formAssignee}
          onTitleChange={setFormTitle}
          onDescriptionChange={setFormDescription}
          onSeverityChange={setFormSeverity}
          onAssigneeChange={setFormAssignee}
          onCancel={() => {
            setShowForm(false);
            setScreenshot(null);
            setElementRect(null);
            setElementInfo(null);
            setBrowser(null);
            setOs(null);
            setViewport(null);
            setScrollPosition(null);
            setDevicePixelRatio(null);
            setFormTitle('');
            setFormDescription('');
            setFormSeverity('MEDIUM');
            setFormAssignee('');
          }}
          onSave={(data) => {
            console.log('Issue saved:', data);
            setIssues([data, ...issues]);
            setShowForm(false);
            setScreenshot(null);
            setElementRect(null);
            setElementInfo(null);
            setBrowser(null);
            setOs(null);
            setViewport(null);
            setScrollPosition(null);
            setDevicePixelRatio(null);
            setFormTitle('');
            setFormDescription('');
            setFormSeverity('MEDIUM');
            setFormAssignee('');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
          }}
          onStartAnnotate={() => {
            setShowForm(false);
            setShowAnnotationEditor(true);
          }}
        />
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center pointer-events-none">
          <div className="bg-emerald-500 text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <CheckCircle2 size={28} className="animate-pulse" />
            <span className="text-lg font-bold">Issue Raised!</span>
          </div>
        </div>
      )}

      {showAnnotationEditor && screenshot && (
        <AnnotationEditor 
          image={screenshot}
          onCancel={() => {
            setShowAnnotationEditor(false);
            setShowForm(true);
          }}
          onSave={(annotatedImage) => {
            setScreenshot(annotatedImage);
            setShowAnnotationEditor(false);
            setShowForm(true);
          }}
        />
      )}
    </div>
  );
};

export default SidebarApp;
