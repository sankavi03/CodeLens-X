import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore, type Workspace } from '../hooks/useWorkspaceStore';
import { useAuthStore } from '../hooks/useAuthStore';
import { 
  FolderUp, Search, Trash2, Code2, LogOut, Cpu, 
  CheckCircle2, XCircle, Loader2, ArrowRight 
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const { 
    workspaces, fetchWorkspaces, deleteWorkspace, 
    uploadWorkspace, selectWorkspace 
  } = useWorkspaceStore();

  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Polling mechanism to check workspace parsing status transitions
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
      setUploadError('Only ZIP archives are accepted for analysis.');
      return;
    }

    setUploading(true);
    try {
      await uploadWorkspace(file);
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Failed to upload project ZIP folder.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this workspace? This deletes all parsed configurations and code.')) {
      try {
        await deleteWorkspace(id);
      } catch (err) {
        alert('Failed to delete workspace.');
      }
    }
  };

  const handleSelectWorkspace = async (w: Workspace) => {
    if (w.status === 'READY') {
      await selectWorkspace(w);
      navigate(`/workspace/${w.workspaceId}`);
    }
  };

  const filteredWorkspaces = workspaces.filter((w) =>
    w.projectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] font-sans antialiased overflow-y-auto">
      {/* Command Bar / Nav */}
      <header className="border-b border-panel-border bg-panel-sidebar px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-500/10 border border-brand-500/20 text-brand-400">
            <Cpu className="h-4.5 w-4.5" />
          </div>
          <span className="font-mono text-sm font-bold tracking-tight text-white flex items-center gap-1">
            CodeLens <span className="text-brand-400">X</span>
          </span>
          <span className="bg-[#1e293b] text-panel-text text-[10px] font-mono px-2 py-0.5 rounded ml-2">Console</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right font-mono text-xs">
            <span className="text-white font-medium">{user?.username || 'developer'}</span>
            <span className="text-[10px] text-panel-text">Authenticated SDE</span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex h-8 w-8 items-center justify-center rounded border border-panel-border hover:border-red-500/50 hover:bg-red-950/10 text-panel-text hover:text-red-400 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10 text-left font-mono">
          <h1 className="text-2xl font-bold text-white mb-2">Developer Workspace Console</h1>
          <p className="text-xs text-panel-text">Upload project repositories (.zip) to parse and explore structure using Gemini context models.</p>
        </div>

        {/* Drag & Drop Upload Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer mb-10 text-center ${
            dragOver 
              ? 'border-brand-500 bg-brand-500/5' 
              : 'border-panel-border bg-panel-sidebar hover:border-panel-border/80'
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
              <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
              <p className="text-sm font-mono text-white">Streaming package bytes to parsed directories...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 bg-panel-border/30 rounded-lg flex items-center justify-center text-panel-text mb-4">
                <FolderUp className="h-6 w-6" />
              </div>
              <p className="text-sm font-mono text-white mb-1.5">Drag & drop project ZIP folder here, or click to browse</p>
              <p className="text-xs font-mono text-panel-text">Accepts zip archives containing Java, Python, or JS/TS codebases (Max 200MB)</p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="flex items-start gap-3 bg-red-950/20 border border-red-900/30 text-red-400 p-4 rounded-lg text-xs font-mono mb-8 text-left">
            <XCircle className="h-5 w-5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Workspaces List section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-panel-border/50 pb-2 mb-6">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Repository Workspaces</h2>
            <div className="relative w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter repositories..."
                className="w-full bg-panel-sidebar border border-panel-border focus:border-brand-500 focus:outline-none pl-9 pr-4 py-1.5 rounded text-xs transition-colors text-white placeholder-panel-text/50 font-mono"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-panel-text/50" />
            </div>
          </div>

          {filteredWorkspaces.length === 0 ? (
            <div className="border border-panel-border bg-panel-sidebar p-12 rounded-lg text-center font-mono">
              <Code2 className="h-8 w-8 text-panel-text/30 mx-auto mb-3" />
              <p className="text-sm text-panel-text">No active repositories loaded.</p>
              <p className="text-xs text-panel-text/50 mt-1">Upload a zip folder to initialize code understanding models.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWorkspaces.map((w) => (
                <div
                  key={w.workspaceId}
                  onClick={() => handleSelectWorkspace(w)}
                  className={`border border-panel-border bg-panel-sidebar p-5 rounded-lg text-left transition-all relative group font-mono ${
                    w.status === 'READY' 
                      ? 'hover:border-brand-500/50 hover:bg-panel-bg cursor-pointer' 
                      : 'opacity-85 pointer-events-none'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-brand-400" />
                      <span className="text-sm font-bold text-white">{w.projectName}</span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, w.workspaceId)}
                      className="p-1 text-panel-text hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete Workspace"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="text-[10px] text-panel-text space-y-1 mb-4">
                    <div>File: <span className="text-white">{w.uploadedFileName}</span></div>
                    <div>Uploaded: <span className="text-white">{new Date(w.uploadTime).toLocaleString()}</span></div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-panel-border/30">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {w.status === 'READY' && (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">READY</span>
                        </>
                      )}
                      {(w.status === 'PARSING' || w.status === 'UPLOADED') && (
                        <>
                          <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                          <span className="text-amber-400 font-bold">PARSING TREE...</span>
                        </>
                      )}
                      {w.status === 'FAILED' && (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-red-400 font-bold">FAILED</span>
                        </>
                      )}
                    </div>

                    {w.status === 'READY' && (
                      <span className="text-[10px] text-brand-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
    </div>
  );
};

export default Dashboard;
