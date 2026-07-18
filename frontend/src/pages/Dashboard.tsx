import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore, type Workspace } from '../hooks/useWorkspaceStore';
import { useAuthStore } from '../hooks/useAuthStore';
import { useToastStore } from '../hooks/useToastStore';
import { LensMascot } from '../components/LensMascot';
import api from '../services/api';
import { 
  FolderUp, Search, Trash2, Code2, LogOut, Cpu, 
  CheckCircle2, XCircle, Loader2, ArrowRight,
  BookOpen, Layers, GitFork, Play 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);

  const { 
    workspaces, fetchWorkspaces, deleteWorkspace, 
    uploadWorkspace, selectWorkspace 
  } = useWorkspaceStore();

  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Progressive parsing loaders
  const [loaderMessage, setLoaderMessage] = useState('Parsing workspace structure...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Onboarding Modal state
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('codelens_onboarded') !== 'true';
  });
  const [onboardingStep, setOnboardingStep] = useState(1);

  // Detailed metrics for the selected/last opened workspace
  const [lastOpenedWorkspace, setLastOpenedWorkspace] = useState<Workspace | null>(null);
  const [lastWorkspaceStats, setLastWorkspaceStats] = useState<any>(null);
  const [lastWorkspaceInsights, setLastWorkspaceInsights] = useState<any>(null);
  const [isLoadingLastMetrics, setIsLoadingLastMetrics] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Determine last opened workspace
  useEffect(() => {
    if (workspaces.length > 0) {
      const readyWorkspaces = workspaces.filter(w => w.status === 'READY');
      if (readyWorkspaces.length > 0) {
        // Sort by upload time desc
        const sorted = [...readyWorkspaces].sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
        setLastOpenedWorkspace(sorted[0]);
      }
    }
  }, [workspaces]);

  // Load metrics for the last opened workspace
  useEffect(() => {
    if (!lastOpenedWorkspace) return;
    setIsLoadingLastMetrics(true);
    Promise.all([
      api.get(`/api/workspaces/${lastOpenedWorkspace.workspaceId}/analysis/stats`),
      api.get(`/api/workspaces/${lastOpenedWorkspace.workspaceId}/analysis/insights`)
    ]).then(([statsRes, insightsRes]) => {
      setLastWorkspaceStats(statsRes.data);
      setLastWorkspaceInsights(insightsRes.data);
    }).catch(() => {
      setLastWorkspaceStats(null);
      setLastWorkspaceInsights(null);
    }).finally(() => {
      setIsLoadingLastMetrics(false);
    });
  }, [lastOpenedWorkspace]);

  // Cycle loader messages when uploading/parsing
  useEffect(() => {
    if (!uploading) return;
    const messages = [
      'Parsing workspace structure...',
      'Reading project folders...',
      'Mapping source directory imports...',
      'Building internal coupling matrices...',
      'Contacting Gemini context analyzer...',
      'Finalizing dashboard overview...'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setLoaderMessage(messages[idx]);
    }, 2000);
    return () => clearInterval(interval);
  }, [uploading]);

  // Polling parsing workspaces status transitions
  useEffect(() => {
    const hasParsing = workspaces.some(
      (w) => w.status === 'UPLOADED' || w.status === 'PARSING'
    );

    if (hasParsing) {
      const interval = setInterval(() => {
        fetchWorkspaces();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [workspaces, fetchWorkspaces]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setUploadError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleUpload(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleUpload(files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadError('Only ZIP archives are accepted.');
      addToast('Invalid file format. Upload .zip only.', 'error');
      return;
    }

    setUploading(true);
    try {
      await uploadWorkspace(file);
      addToast('Project uploaded successfully. Parsing...', 'success');
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Failed to upload project ZIP.');
      addToast('Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this workspace? This deletes all parsed configurations and code.')) {
      try {
        await deleteWorkspace(id);
        addToast('Workspace deleted.', 'success');
        if (lastOpenedWorkspace?.workspaceId === id) {
          setLastOpenedWorkspace(null);
          setLastWorkspaceStats(null);
          setLastWorkspaceInsights(null);
        }
      } catch (err) {
        console.error("Failed to delete workspace:", err);
        addToast('Failed to delete workspace.', 'error');
      }
    }
  };

  const handleSelectWorkspace = async (w: Workspace) => {
    if (w.status === 'READY') {
      await selectWorkspace(w);
      navigate(`/workspace/${w.workspaceId}`);
    }
  };

  const handleQuickAction = (action: string) => {
    if (!lastOpenedWorkspace) {
      addToast('Please upload and select a workspace first.', 'info');
      return;
    }
    selectWorkspace(lastOpenedWorkspace).then(() => {
      if (action === 'launch') {
        navigate(`/workspace/${lastOpenedWorkspace.workspaceId}`);
      } else if (action === 'readme') {
        navigate(`/workspace/${lastOpenedWorkspace.workspaceId}`);
        setTimeout(() => {
          const btn = document.getElementById('readme-btn-trigger');
          if (btn) btn.click();
        }, 800);
      } else if (action === 'docs') {
        navigate(`/workspace/${lastOpenedWorkspace.workspaceId}`);
        setTimeout(() => {
          const btn = document.getElementById('docs-btn-trigger');
          if (btn) btn.click();
        }, 800);
      } else if (action === 'architecture') {
        navigate(`/workspace/${lastOpenedWorkspace.workspaceId}`);
        setTimeout(() => {
          setLastOpenedWorkspace(lastOpenedWorkspace);
          // Set to architecture mode
          const trigger = document.getElementById('tab-graph-trigger');
          if (trigger) trigger.click();
        }, 800);
      }
    });
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem('codelens_onboarded', 'true');
    setShowOnboarding(false);
    addToast('Onboarding complete. Welcome to CodeLens-X!', 'success');
  };

  const filteredWorkspaces = workspaces.filter((w) =>
    w.projectName.toLowerCase().includes(search.toLowerCase())
  );

  // Health score algorithm
  const healthScore = lastWorkspaceInsights?.codeSmells 
    ? Math.max(50, 100 - (lastWorkspaceInsights.codeSmells.length * 8) - (lastWorkspaceStats?.totalFiles > 20 ? 5 : 0))
    : 100;

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#F0F6FC] font-sans antialiased overflow-y-auto relative">
      
      {/* Top command Bar Nav */}
      <header className="border-b border-[#30363D] bg-[#161B22] px-6 py-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC]">
            <Cpu className="h-4.5 w-4.5" />
          </div>
          <span className="font-mono text-xs font-bold tracking-tight text-white flex items-center gap-0.5">
            CodeLens <span className="text-[#7C5CFC]">X</span>
          </span>
          <span className="bg-[#0D1117] border border-[#30363D] text-[#8B949E] text-[9px] font-mono px-2 py-0.5 rounded ml-2">Console</span>
        </div>

        <div className="flex items-center gap-4">
          {user?.profileImage && (
            <img 
              src={user.profileImage} 
              alt={user.displayName || 'avatar'} 
              className="w-7 h-7 rounded-full border border-[#30363D] object-cover hidden sm:block"
            />
          )}
          <div className="flex flex-col text-right font-mono text-[10px] select-none">
            <span className="text-white font-bold">{user?.displayName || user?.username || 'developer'}</span>
            <span className="text-[#8B949E] opacity-70">Authenticated Developer</span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#30363D] hover:border-red-500/50 hover:bg-red-950/10 text-[#8B949E] hover:text-[#F85149] transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        
        {/* Quick Actions Panel */}
        <div className="flex flex-wrap gap-2.5 items-center justify-start mb-8 select-none font-mono text-[10px]">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#7C5CFC]/10"
          >
            <FolderUp className="h-3.5 w-3.5" /> Upload Project
          </button>
          <button
            onClick={() => handleQuickAction('launch')}
            className="px-3.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white rounded transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5 text-[#22C55E]" /> Open Last Workspace
          </button>
          <button
            onClick={() => handleQuickAction('readme')}
            className="px-3.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white rounded transition-all cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#58A6FF]" /> Generate README
          </button>
          <button
            onClick={() => handleQuickAction('docs')}
            className="px-3.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white rounded transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="h-3.5 w-3.5 text-[#D29922]" /> Generate Docs
          </button>
          <button
            onClick={() => handleQuickAction('architecture')}
            className="px-3.5 py-1.5 bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white rounded transition-all cursor-pointer flex items-center gap-1.5"
          >
            <GitFork className="h-3.5 w-3.5 text-[#a78bfa]" /> Trace Architecture
          </button>
        </div>

        {/* Drag & Drop Upload Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer mb-8 text-center select-none ${
            dragOver 
              ? 'border-[#7C5CFC] bg-[#7C5CFC]/5' 
              : 'border-[#30363D] bg-[#161B22] hover:border-[#8B949E]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".zip"
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 text-[#7C5CFC] animate-spin" />
              <p className="text-xs font-mono text-white animate-pulse">{loaderMessage}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 bg-[#0D1117] border border-[#30363D] rounded-lg flex items-center justify-center text-[#8B949E] mb-3">
                <FolderUp className="h-5 w-5" />
              </div>
              <p className="text-xs font-mono text-white mb-1">Drag & drop project ZIP folder here, or click to browse</p>
              <p className="text-[10px] font-mono text-[#8B949E]">Accepts Java, Python, or JS/TS repositories (Max 200MB)</p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="flex items-start gap-2.5 bg-red-950/20 border border-red-900/30 text-red-400 p-3.5 rounded text-xs font-mono mb-8 text-left">
            <XCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Active Stats & Last Opened metrics */}
        {lastOpenedWorkspace && (
          <div className="grid grid-cols-12 gap-4 mb-8 text-left font-mono select-none">
            
            {/* Last opened overview card */}
            <div className="col-span-12 md:col-span-4 bg-[#1C2128] border border-[#30363D] p-4 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#7C5CFC] tracking-wider">Last Opened Workspace</span>
                <h3 className="text-sm font-bold text-white mt-1.5 truncate">{lastOpenedWorkspace.projectName}</h3>
                <p className="text-[10px] text-[#8B949E] mt-0.5 truncate">{lastOpenedWorkspace.uploadedFileName}</p>
              </div>
              
              <button
                onClick={() => handleSelectWorkspace(lastOpenedWorkspace)}
                className="mt-6 w-full py-1.5 bg-[#7C5CFC]/15 hover:bg-[#7C5CFC] text-white border border-[#7C5CFC]/30 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                Launch SDE IDE <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Health Score Card */}
            <div className="col-span-6 md:col-span-4 bg-[#1C2128] border border-[#30363D] p-4 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#8B949E] tracking-wider">Workspace Health</span>
                {isLoadingLastMetrics ? (
                  <div className="flex items-center gap-1.5 text-xs text-[#8B949E] mt-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Parsing smells...</span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{healthScore}%</span>
                    <span className="text-[9px] text-[#3FB950] font-bold">Stable</span>
                  </div>
                )}
              </div>
              <div className="text-[9px] text-[#8B949E] mt-4 border-t border-[#30363D]/40 pt-2">
                Derived from code smells, imports circular checks, and complexity scores.
              </div>
            </div>

            {/* Statistics summary */}
            <div className="col-span-6 md:col-span-4 bg-[#1C2128] border border-[#30363D] p-4 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#8B949E] tracking-wider">Structure Summary</span>
                {isLoadingLastMetrics ? (
                  <div className="flex items-center gap-1.5 text-xs text-[#8B949E] mt-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Mapping structures...</span>
                  </div>
                ) : lastWorkspaceStats ? (
                  <div className="mt-2.5 space-y-1 text-[10px] text-[#8B949E]">
                    <div>Total Files: <span className="text-white font-bold">{lastWorkspaceStats.totalFiles}</span></div>
                    <div>Source Classes: <span className="text-white font-bold">{lastWorkspaceStats.totalClasses || 0}</span></div>
                    <div>Design Patterns: <span className="text-[#a78bfa] font-bold">{lastWorkspaceInsights?.detectedPatterns?.length || 0}</span></div>
                    <div>Code Smells: <span className="text-[#F85149] font-bold">{lastWorkspaceInsights?.codeSmells?.length || 0}</span></div>
                  </div>
                ) : (
                  <div className="text-[10px] text-[#8B949E]/50 italic mt-3">No stats compiled yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workspaces List section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#30363D]/50 pb-2 mb-6 select-none font-mono">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Repository Workspaces</h2>
            <div className="relative w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter repositories..."
                className="w-full bg-[#161B22] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none pl-8 pr-4 py-1 rounded text-xs transition-colors text-white placeholder-[#8B949E]/40"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8B949E]/40" />
            </div>
          </div>

          {filteredWorkspaces.length === 0 ? (
            <div className="border border-[#30363D] bg-[#161B22] p-12 rounded-lg text-center font-mono select-none">
              <LensMascot size={48} mood="sleeping" className="mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">No Workspace Uploaded</h3>
              <p className="text-[10px] text-[#8B949E] max-w-xs mx-auto mb-4">You have not initialized any codebase explorer. Stream a zip folder to start analyzing patterns.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded text-[10px] font-bold cursor-pointer"
              >
                Upload Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWorkspaces.map((w) => (
                <div
                  key={w.workspaceId}
                  onClick={() => handleSelectWorkspace(w)}
                  className={`border border-[#30363D] bg-[#161B22] p-5 rounded-lg text-left transition-all relative group font-mono ${
                    w.status === 'READY' 
                      ? 'hover:border-[#7C5CFC]/50 hover:bg-[#1C2128] cursor-pointer' 
                      : 'opacity-85 pointer-events-none'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-[#7C5CFC]" />
                      <span className="text-xs font-bold text-white">{w.projectName}</span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, w.workspaceId)}
                      className="p-1 text-[#8B949E] hover:text-[#F85149] hover:bg-[#F85149]/10 border border-transparent hover:border-[#F85149]/35 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete Workspace"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="text-[10px] text-[#8B949E] space-y-1 mb-4 select-text">
                    <div>File Name: <span className="text-white">{w.uploadedFileName}</span></div>
                    <div>Uploaded: <span className="text-white">{new Date(w.uploadTime).toLocaleString()}</span></div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#30363D]/30 select-none">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold">
                      {w.status === 'READY' && (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#3FB950]" />
                          <span className="text-[#3FB950]">READY</span>
                        </>
                      )}
                      {(w.status === 'PARSING' || w.status === 'UPLOADED') && (
                        <>
                          <Loader2 className="h-3.5 w-3.5 text-[#D29922] animate-spin" />
                          <span className="text-[#D29922]">PARSING TREE...</span>
                        </>
                      )}
                      {w.status === 'FAILED' && (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-[#F85149]" />
                          <span className="text-[#F85149]">FAILED</span>
                        </>
                      )}
                    </div>

                    {w.status === 'READY' && (
                      <span className="text-[9px] text-[#7C5CFC] font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                        Launch IDE <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ONBOARDING MODAL OVERLAY */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-mono select-none">
          <div className="bg-[#161B22] border border-[#30363D] w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="h-10 border-b border-[#30363D] bg-[#0d1017] px-4 flex items-center justify-between text-xs text-white font-bold">
              <span>CodeLens-X Interactive Guide</span>
              <button onClick={() => setShowOnboarding(false)} className="hover:text-[#EF4444] text-xs">×</button>
            </div>
            
            {/* Steps Container */}
            <div className="p-6 text-left flex-1 min-h-0">
              <div className="flex justify-center mb-6">
                <LensMascot size={56} mood={onboardingStep === 5 ? 'happy' : 'neutral'} />
              </div>
              
              {onboardingStep === 1 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Welcome to CodeLens-X</h3>
                  <p className="text-[11px] text-[#8B949E] leading-relaxed">
                    CodeLens-X is an intelligent developer workspace designed to map out class outlines, trace couplings, and explain features via Gemini context templates.
                  </p>
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Step 1: Upload Project ZIP</h3>
                  <p className="text-[11px] text-[#8B949E] leading-relaxed">
                    Stream any code repository package (.zip format containing Java, Python, or JS files). We unpack it securely inside local directories.
                  </p>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Step 2: Analyze Workspace</h3>
                  <p className="text-[11px] text-[#8B949E] leading-relaxed">
                    The backend scanner immediately parses dependency imports, calculates healthy scores, and extracts design pattern structures automatically on boot.
                  </p>
                </div>
              )}

              {onboardingStep === 4 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Step 3: Explore Architecture</h3>
                  <p className="text-[11px] text-[#8B949E] leading-relaxed">
                    Navigate package circular flows inside the React Flow interactive dependency coupling map, and click nodes to highlight adjacent dependencies.
                  </p>
                </div>
              )}

              {onboardingStep === 5 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Ready for understanding!</h3>
                  <p className="text-[11px] text-[#8B949E] leading-relaxed">
                    Ask Lens details about code smells, search references via breadcrumbs, and generate README specifications with a single click.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions footer */}
            <div className="px-6 py-4 bg-[#0d1017] border-t border-[#30363D] flex justify-between items-center text-xs">
              <button 
                type="button" 
                onClick={handleFinishOnboarding}
                className="text-[#8B949E] hover:text-white"
              >
                Skip Guide
              </button>
              
              <div className="flex gap-2">
                {onboardingStep > 1 && (
                  <button 
                    onClick={() => setOnboardingStep(prev => prev - 1)}
                    className="px-3 py-1 bg-[#21262D] border border-[#30363D] hover:text-white rounded text-[11px] cursor-pointer"
                  >
                    Back
                  </button>
                )}
                {onboardingStep < 5 ? (
                  <button 
                    onClick={() => setOnboardingStep(prev => prev + 1)}
                    className="px-3 py-1 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    Next
                  </button>
                ) : (
                  <button 
                    onClick={handleFinishOnboarding}
                    className="px-3 py-1 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    Got It!
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
