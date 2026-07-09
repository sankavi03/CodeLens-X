import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MonacoEditor from '@monaco-editor/react';
import { useWorkspaceStore, type FileNode } from '../hooks/useWorkspaceStore';
import { useCommandStore } from '../hooks/useCommandStore';
import { ExplorerTree } from '../components/ExplorerTree';
import { CommandPalette } from '../components/CommandPalette';
import { ContextMenu } from '../components/ContextMenu';
import { DependencyGraph } from '../components/DependencyGraph';
import { MermaidViewer } from '../components/MermaidViewer';
import api from '../services/api';

import { 
  Folder, MessageSquareCode, Activity, GitFork, BookOpen, 
  Loader2, Sparkles, Copy, Cpu, Code2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export const WorkspaceIde: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const setPaletteOpen = useCommandStore((state) => state.setPaletteOpen);

  const {
    activeWorkspace, projectTree, openTabs, activeTab, 
    fileContent, isLoadingContent, 
    openFile, closeFile, setActiveTab, selectWorkspace
  } = useWorkspaceStore();

  // Navigation Panel Switches: 'explorer' | 'search' | 'copilot' | 'insights' | 'docs' | 'settings'
  const [activeSidebar, setActiveSidebar] = useState<'explorer' | 'copilot' | 'insights' | 'docs'>('explorer');

  // Center workspace mode: 'editor' | 'graph' | 'architecture' | 'readme' | 'generated-docs'
  const [editorMode, setEditorMode] = useState<'editor' | 'graph' | 'architecture' | 'readme' | 'generated-docs'>('editor');

  // Bottom terminal tabs: 'stats' | 'insights' | 'patterns'
  const [bottomTab, setBottomTab] = useState<'stats' | 'insights' | 'patterns'>('stats');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  // Analysis state caching
  const [statsData, setStatsData] = useState<any>(null);
  const [dependenciesData, setDependenciesData] = useState<any>(null);
  const [patternsData, setPatternsData] = useState<any>(null);
  const [insightsData, setInsightsData] = useState<any>(null);
  
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [docContent, setDocContent] = useState<string>('');
  const [architectureContent, setArchitectureContent] = useState<string>('');

  // Loading indicators
  const [generatingReadme, setGeneratingReadme] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [generatingArch, setGeneratingArch] = useState(false);
  const [explainingFile, setExplainingFile] = useState(false);

  // AI Chat session state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Explorer search
  const [explorerSearch, setExplorerSearch] = useState('');

  // Fetch all initial project details
  useEffect(() => {
    if (workspaceId) {
      // Restore workspace selection
      api.get(`/api/workspaces/${workspaceId}`)
        .then((res) => {
          selectWorkspace(res.data);
          // Pre-fetch general analysis stats
          loadAnalysisData();
        })
        .catch(() => navigate('/dashboard'));
    }
  }, [workspaceId, selectWorkspace, navigate]);

  const loadAnalysisData = async () => {
    if (!workspaceId) return;
    try {
      const [stats, deps, pats, ins] = await Promise.all([
        api.get(`/api/workspaces/${workspaceId}/analysis/stats`),
        api.get(`/api/workspaces/${workspaceId}/analysis/dependencies`),
        api.get(`/api/workspaces/${workspaceId}/analysis/design-patterns`),
        api.get(`/api/workspaces/${workspaceId}/analysis/insights`),
      ]);
      setStatsData(stats.data);
      setDependenciesData(deps.data);
      setPatternsData(pats.data);
      setInsightsData(ins.data);
    } catch (err) {
      console.warn('Failed to load code insights:', err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node
    });
  };

  const handleContextMenuAction = async (action: string, node: FileNode) => {
    if (action === 'explain') {
      openFile(node.relativePath);
      setActiveSidebar('copilot');
      handleExplainFile(node.relativePath);
    } else if (action === 'docs') {
      openFile(node.relativePath);
      handleGenerateDocs(node.relativePath);
    } else if (action === 'dependencies') {
      setEditorMode('graph');
    }
  };

  const handleExplainFile = async (path: string) => {
    setExplainingFile(true);
    setActiveSidebar('copilot');
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/ai/explain-file`, null, {
        params: { path }
      });
      const explanation = response.data.explanation;
      setChatMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), role: 'USER', content: `Explain the file: ${path}` },
        { id: Math.random().toString(), role: 'ASSISTANT', content: explanation }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setExplainingFile(false);
    }
  };

  const handleGenerateDocs = async (path: string) => {
    setGeneratingDocs(true);
    setEditorMode('generated-docs');
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/generator/docs`, null, {
        params: { path }
      });
      setDocContent(response.data.documentation);
    } catch (err) {
      setDocContent('# Failed to generate documentation.');
    } finally {
      setGeneratingDocs(false);
    }
  };

  const handleGenerateReadme = async () => {
    setGeneratingReadme(true);
    setEditorMode('readme');
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/generator/readme`);
      setReadmeContent(response.data.readme);
    } catch (err) {
      setReadmeContent('# Failed to generate README.');
    } finally {
      setGeneratingReadme(false);
    }
  };

  const handleGenerateArchitecture = async () => {
    setGeneratingArch(true);
    setEditorMode('architecture');
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/generator/architecture`);
      setArchitectureContent(response.data.architecture);
    } catch (err) {
      setArchitectureContent('graph TD\n    A[Error] --> B[Failed to compile architecture]');
    } finally {
      setGeneratingArch(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatLoading(true);

    setChatMessages((prev) => [...prev, { id: Math.random().toString(), role: 'USER', content: userMsg }]);

    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/ai/chat`, {
        message: userMsg,
        conversationId: activeConversationId
      });

      const reply = response.data;
      setActiveConversationId(reply.conversationId);
      setChatMessages((prev) => [
        ...prev,
        { id: reply.messageId, role: reply.role, content: reply.content }
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), role: 'ASSISTANT', content: 'Connection timed out. Please check backend status.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper to filter nodes in explorer search
  const filterTree = (node: FileNode | null, search: string): FileNode | null => {
    if (!node) return null;
    if (!search) return node;

    if (node.type === 'FILE') {
      return node.name.toLowerCase().includes(search.toLowerCase()) ? node : null;
    }

    const filteredChildren = (node.children || [])
      .map(child => filterTree(child, search))
      .filter((child): child is FileNode => child !== null);

    if (filteredChildren.length > 0 || node.name.toLowerCase().includes(search.toLowerCase())) {
      return { ...node, children: filteredChildren };
    }

    return null;
  };

  const visibleTree = filterTree(projectTree, explorerSearch);

  // Format Recharts data
  const languageChartData = statsData?.percentageByLanguage
    ? Object.keys(statsData.percentageByLanguage).map((lang) => ({
        name: lang,
        percentage: statsData.percentageByLanguage[lang],
      }))
    : [];

  const sizeChartData = statsData?.fileSizeDistribution
    ? Object.keys(statsData.fileSizeDistribution).map((sizeRange) => ({
        name: sizeRange,
        files: statsData.fileSizeDistribution[sizeRange],
      }))
    : [];

  return (
    <div className="flex h-screen w-screen flex-col bg-[#07090e] font-sans antialiased text-[#e2e8f0] relative select-none">
      
      {/* Keyboard palette overlays */}
      <CommandPalette />
      
      {/* Context Menu overlay */}
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          node={contextMenu.node} 
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}

      {/* Hidden layout action bindings to couple Command Palette */}
      <button id="explain-btn-trigger" className="hidden" onClick={() => activeTab && handleExplainFile(activeTab)}></button>
      <button id="docs-btn-trigger" className="hidden" onClick={() => activeTab && handleGenerateDocs(activeTab)}></button>
      <button id="readme-btn-trigger" className="hidden" onClick={handleGenerateReadme}></button>
      
      <button id="tab-stats-trigger" className="hidden" onClick={() => { setBottomTab('stats'); }}></button>
      <button id="tab-insights-trigger" className="hidden" onClick={() => { setBottomTab('insights'); }}></button>
      <button id="tab-patterns-trigger" className="hidden" onClick={() => { setBottomTab('patterns'); }}></button>
      
      <button id="tab-graph-trigger" className="hidden" onClick={() => { setEditorMode('graph'); }}></button>

      {/* Top Command Bar */}
      <div className="flex h-12 w-full items-center justify-between border-b border-panel-border bg-panel-sidebar px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-brand-500/10 border border-brand-500/20 text-brand-400">
            <Cpu className="h-4 w-4" />
          </div>
          <span className="font-mono text-xs font-bold tracking-tight text-white flex items-center gap-0.5">
            CodeLens <span className="text-brand-400">X</span>
          </span>
          <span className="h-4 w-px bg-panel-border mx-2"></span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-panel-text">
            <span>Workspace:</span>
            <span className="text-white font-bold">{activeWorkspace?.projectName}</span>
          </div>
        </div>

        {/* Global Command palette search shortcut suggestion */}
        <div 
          onClick={() => setPaletteOpen(true)}
          className="bg-panel-bg hover:bg-panel-hover border border-panel-border px-3 py-1 rounded text-[11px] font-mono text-panel-text flex items-center gap-4 cursor-pointer select-none transition-colors"
        >
          <span>Search or run commands...</span>
          <span className="opacity-50 text-[10px] bg-panel-sidebar px-1 py-0.5 rounded border border-panel-border">Ctrl + Shift + P</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <button 
            onClick={() => navigate('/dashboard')}
            className="hover:text-white px-2.5 py-1 border border-panel-border hover:border-brand-500 bg-[#1e293b]/50 rounded cursor-pointer transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        
        {/* Left Activity Bar */}
        <div className="w-12 border-r border-panel-border bg-[#0b0d12] flex flex-col items-center py-4 justify-between shrink-0 select-none">
          <div className="flex flex-col gap-5 text-panel-text">
            <button 
              onClick={() => setActiveSidebar('explorer')}
              className={`p-2 hover:text-white hover:bg-panel-hover rounded-lg transition-all cursor-pointer ${activeSidebar === 'explorer' ? 'text-brand-400 bg-brand-500/5 border-l-2 border-brand-500 rounded-l-none pl-1.5' : ''}`}
              title="File Explorer"
            >
              <Folder className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setActiveSidebar('copilot')}
              className={`p-2 hover:text-white hover:bg-panel-hover rounded-lg transition-all cursor-pointer ${activeSidebar === 'copilot' ? 'text-brand-400 bg-brand-500/5 border-l-2 border-brand-500 rounded-l-none pl-1.5' : ''}`}
              title="AI Assistant Chat"
            >
              <MessageSquareCode className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setActiveSidebar('insights')}
              className={`p-2 hover:text-white hover:bg-panel-hover rounded-lg transition-all cursor-pointer ${activeSidebar === 'insights' ? 'text-brand-400 bg-brand-500/5 border-l-2 border-brand-500 rounded-l-none pl-1.5' : ''}`}
              title="Project Insights"
            >
              <Activity className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setActiveSidebar('docs')}
              className={`p-2 hover:text-white hover:bg-panel-hover rounded-lg transition-all cursor-pointer ${activeSidebar === 'docs' ? 'text-brand-400 bg-brand-500/5 border-l-2 border-brand-500 rounded-l-none pl-1.5' : ''}`}
              title="Doc Generators"
            >
              <BookOpen className="h-5 w-5" />
            </button>
          </div>
          
          <button 
            onClick={() => setEditorMode('graph')}
            className={`p-2 text-panel-text hover:text-white hover:bg-panel-hover rounded-lg transition-all cursor-pointer ${editorMode === 'graph' ? 'text-brand-400' : ''}`}
            title="Dependency Network"
          >
            <GitFork className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar panels */}
        <div className="w-[260px] border-r border-panel-border bg-panel-sidebar flex flex-col shrink-0 select-none overflow-hidden">
          
          {activeSidebar === 'explorer' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-panel-border/40 shrink-0">
                <div className="text-[10px] font-mono font-bold tracking-wider text-panel-text uppercase mb-2">Workspace Files</div>
                <input
                  type="text"
                  value={explorerSearch}
                  onChange={(e) => setExplorerSearch(e.target.value)}
                  placeholder="Filter by name..."
                  className="w-full bg-[#181d28] border border-panel-border focus:border-brand-500 focus:outline-none px-2.5 py-1.5 rounded text-[11px] font-mono text-white placeholder-panel-text/40"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {visibleTree ? (
                  <ExplorerTree 
                    node={visibleTree} 
                    onFileSelect={(path) => {
                      setEditorMode('editor');
                      openFile(path);
                    }}
                    onContextMenu={handleContextMenu}
                    activePath={activeTab}
                  />
                ) : (
                  <div className="text-[11px] font-mono text-panel-text/50 p-4 text-center">Empty directory or searching...</div>
                )}
              </div>
            </div>
          )}

          {activeSidebar === 'copilot' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-panel-border/40 shrink-0 font-mono">
                <div className="text-[10px] font-bold tracking-wider text-panel-text uppercase">AI Code Explanations</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 select-text text-left font-mono">
                {activeTab ? (
                  <div className="space-y-4">
                    <div className="bg-[#181d28] p-3 border border-panel-border rounded text-[11px]">
                      <div className="text-panel-text mb-1.5">Selected file:</div>
                      <div className="text-white font-bold truncate">{activeTab.split('/').pop()}</div>
                    </div>
                    <button
                      onClick={() => handleExplainFile(activeTab)}
                      disabled={explainingFile}
                      className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium py-2 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      {explainingFile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Parsing File...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Explain Active File</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-panel-text/50 text-center py-10">Select a file in explorer to query AI explanations.</div>
                )}
              </div>
            </div>
          )}

          {activeSidebar === 'insights' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-panel-border/40 shrink-0 font-mono">
                <div className="text-[10px] font-bold tracking-wider text-panel-text uppercase">Project Health overview</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-left">
                {statsData ? (
                  <>
                    <div className="bg-[#181d28] p-3 border border-panel-border rounded text-[11px] space-y-2">
                      <div className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-panel-border/30 pb-1">Codebase Summary</div>
                      <div>Total Files: <span className="text-white font-bold">{statsData.totalFiles}</span></div>
                      <div>Total Folders: <span className="text-white font-bold">{statsData.totalFolders}</span></div>
                      <div>Lines of Code: <span className="text-brand-300 font-bold">{statsData.codeLines}</span></div>
                    </div>
                    
                    {patternsData?.detectedPatterns && (
                      <div className="bg-[#181d28] p-3 border border-panel-border rounded text-[11px]">
                        <div className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-panel-border/30 pb-1 mb-2">Patterns Detected</div>
                        <div className="space-y-1">
                          {patternsData.detectedPatterns.map((pat: any, i: number) => (
                            <div key={i} className="text-[#a78bfa] font-bold">
                              • {pat.patternName} <span className="text-[9px] opacity-60 text-panel-text">({pat.className})</span>
                            </div>
                          ))}
                          {patternsData.detectedPatterns.length === 0 && <div className="text-panel-text/50 text-[10px]">No patterns parsed.</div>}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] text-panel-text/50 text-center py-10">Waiting for statistics to parse...</div>
                )}
              </div>
            </div>
          )}

          {activeSidebar === 'docs' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-panel-border/40 shrink-0 font-mono">
                <div className="text-[10px] font-bold tracking-wider text-panel-text uppercase">Generators</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
                <button
                  onClick={handleGenerateReadme}
                  disabled={generatingReadme}
                  className="w-full bg-[#1e293b] hover:bg-[#334155] border border-panel-border text-white text-xs py-2 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {generatingReadme ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4 text-brand-400" />}
                  <span>Generate README.md</span>
                </button>
                <button
                  onClick={handleGenerateArchitecture}
                  disabled={generatingArch}
                  className="w-full bg-[#1e293b] hover:bg-[#334155] border border-panel-border text-white text-xs py-2 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {generatingArch ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitFork className="h-4 w-4 text-emerald-400" />}
                  <span>Generate Architecture</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center Panel (Tabs, Editor or visual mappings) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-panel-editor relative">
          
          {/* Tab bar header */}
          <div className="h-9 w-full border-b border-panel-border bg-panel-sidebar flex items-center justify-between shrink-0 select-none overflow-hidden">
            <div className="flex items-center h-full overflow-x-auto overflow-y-hidden">
              {openTabs.map((tab) => (
                <div
                  key={tab}
                  onClick={() => {
                    setEditorMode('editor');
                    setActiveTab(tab);
                  }}
                  className={`h-full flex items-center gap-2 px-3 border-r border-panel-border text-xs font-mono cursor-pointer transition-colors ${
                    activeTab === tab && editorMode === 'editor'
                      ? 'bg-panel-editor text-white border-t-2 border-brand-500 font-bold'
                      : 'hover:bg-panel-hover text-panel-text'
                  }`}
                >
                  <span className="truncate max-w-[100px]">{tab.split('/').pop()}</span>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFile(tab);
                    }}
                    className="hover:text-red-400 hover:bg-[#1e293b] p-0.5 rounded"
                  >
                    ×
                  </span>
                </div>
              ))}

              {/* Extra visualization tabs */}
              {editorMode !== 'editor' && (
                <div className="h-full flex items-center gap-1.5 px-3 border-r border-panel-border bg-panel-editor text-xs font-mono font-bold text-white border-t-2 border-brand-500 select-none">
                  <span>Visual Preview: {editorMode.toUpperCase()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-4 text-panel-text font-mono text-[10px]">
              {editorMode === 'editor' && activeTab && (
                <span className="text-emerald-400 font-semibold uppercase">{activeTab.split('.').pop()} FILE</span>
              )}
            </div>
          </div>

          {/* Central Main Content block */}
          <div className="flex-1 overflow-hidden relative">
            {editorMode === 'editor' && (
              <>
                {activeTab ? (
                  isLoadingContent ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-panel-editor/95">
                      <div className="flex flex-col items-center gap-2 text-xs font-mono text-panel-text">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                        <span>Decrypting file bytes...</span>
                      </div>
                    </div>
                  ) : (
                    <MonacoEditor
                      height="100%"
                      language={activeTab.split('.').pop()?.toLowerCase() === 'py' ? 'python' : 'java'}
                      theme="vs-dark"
                      value={fileContent || ''}
                      options={{
                        readOnly: true,
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono, monospace',
                        minimap: { enabled: true },
                        wordWrap: 'on',
                        automaticLayout: true,
                        scrollbar: {
                          verticalScrollbarSize: 10,
                          horizontalScrollbarSize: 10,
                        }
                      }}
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono p-6">
                    <Code2 className="h-10 w-10 text-panel-text/20 mb-3" />
                    <p className="text-sm text-panel-text">No File Opened</p>
                    <p className="text-xs text-panel-text/45 mt-1.5 max-w-xs">Double click files in the Explorer tree to inspect code structure.</p>
                  </div>
                )}
              </>
            )}

            {editorMode === 'graph' && (
              <div className="w-full h-full">
                {dependenciesData?.internalDependencyGraph ? (
                  <DependencyGraph 
                    graph={dependenciesData.internalDependencyGraph} 
                    onNodeClick={(path) => {
                      setEditorMode('editor');
                      openFile(path);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-mono text-panel-text">
                    Calculating internal couplings...
                  </div>
                )}
              </div>
            )}

            {editorMode === 'architecture' && (
              <div className="w-full h-full p-4 overflow-y-auto">
                <MermaidViewer chartCode={architectureContent} />
              </div>
            )}

            {editorMode === 'readme' && (
              <div className="w-full h-full p-8 overflow-y-auto select-text text-left font-mono text-sm leading-relaxed prose prose-invert bg-[#07090e]">
                <div className="flex items-center justify-between border-b border-panel-border/30 pb-3 mb-6">
                  <h1 className="text-lg font-bold text-white flex items-center gap-1.5"><BookOpen className="h-5 w-5 text-brand-400" /> README Preview</h1>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(readmeContent);
                    }}
                    className="flex items-center gap-1.5 hover:text-white px-3 py-1.5 bg-panel-sidebar border border-panel-border rounded text-xs text-panel-text cursor-pointer transition-colors"
                  >
                    <Copy className="h-4 w-4" /> Copy Markdown
                  </button>
                </div>
                {readmeContent ? (
                  <pre className="whitespace-pre-wrap font-sans text-xs bg-[#101420] p-6 border border-panel-border rounded-lg text-panel-text">{readmeContent}</pre>
                ) : (
                  <div className="text-xs text-panel-text/50">Compiling README summary...</div>
                )}
              </div>
            )}

            {editorMode === 'generated-docs' && (
              <div className="w-full h-full p-8 overflow-y-auto select-text text-left font-mono text-sm leading-relaxed bg-[#07090e]">
                <div className="flex items-center justify-between border-b border-panel-border/30 pb-3 mb-6">
                  <h1 className="text-lg font-bold text-white flex items-center gap-1.5"><BookOpen className="h-5 w-5 text-emerald-400" /> Generated Documentation</h1>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(docContent);
                    }}
                    className="flex items-center gap-1.5 hover:text-white px-3 py-1.5 bg-panel-sidebar border border-panel-border rounded text-xs text-panel-text cursor-pointer transition-colors"
                  >
                    <Copy className="h-4 w-4" /> Copy Markdown
                  </button>
                </div>
                {generatingDocs ? (
                  <div className="text-xs text-panel-text/50 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                    <span>Compiling file API guides...</span>
                  </div>
                ) : docContent ? (
                  <pre className="whitespace-pre-wrap font-sans text-xs bg-[#101420] p-6 border border-panel-border rounded-lg text-panel-text">{docContent}</pre>
                ) : (
                  <div className="text-xs text-panel-text/50">Select a file context menu action 'Generate Docs' to compile API guidelines.</div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Panel (Insights, Stats, Patterns) */}
          <div className="h-[200px] border-t border-panel-border bg-panel-sidebar flex flex-col shrink-0 overflow-hidden relative">
            <div className="h-8 border-b border-panel-border/50 px-4 bg-[#0d1017] flex items-center gap-4 text-xs font-mono select-none shrink-0">
              <button
                onClick={() => setBottomTab('stats')}
                className={`py-1 border-b-2 hover:text-white transition-colors cursor-pointer ${
                  bottomTab === 'stats' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-panel-text'
                }`}
              >
                Statistics
              </button>
              <button
                onClick={() => setBottomTab('insights')}
                className={`py-1 border-b-2 hover:text-white transition-colors cursor-pointer ${
                  bottomTab === 'insights' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-panel-text'
                }`}
              >
                Code Smells
              </button>
              <button
                onClick={() => setBottomTab('patterns')}
                className={`py-1 border-b-2 hover:text-white transition-colors cursor-pointer ${
                  bottomTab === 'patterns' ? 'border-brand-500 text-white font-bold' : 'border-transparent text-panel-text'
                }`}
              >
                Design Patterns
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {bottomTab === 'stats' && (
                <div className="grid grid-cols-12 h-full gap-4">
                  <div className="col-span-12 md:col-span-6 h-full flex flex-col">
                    <span className="text-[10px] font-mono text-panel-text uppercase font-bold mb-1 border-b border-panel-border/30 pb-0.5">Language Percentages</span>
                    <div className="flex-1 h-full min-h-[90px] relative">
                      {languageChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={languageChartData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 4 }} />
                            <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                              {languageChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={['#8b5cf6', '#6366f1', '#3b82f6', '#10b981'][index % 4]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-panel-text/40">No stats loaded.</div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-6 h-full flex flex-col">
                    <span className="text-[10px] font-mono text-panel-text uppercase font-bold mb-1 border-b border-panel-border/30 pb-0.5">File Size Distribution</span>
                    <div className="flex-1 h-full min-h-[90px] relative">
                      {sizeChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sizeChartData}>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 4 }} />
                            <Bar dataKey="files" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-panel-text/40">No stats loaded.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {bottomTab === 'insights' && (
                <div className="font-mono text-left space-y-2 select-text">
                  {insightsData?.codeSmells && insightsData.codeSmells.length > 0 ? (
                    insightsData.codeSmells.map((smell: any, i: number) => {
                      const isHigh = smell.severity === 'High';
                      return (
                        <div 
                          key={i} 
                          onClick={() => {
                            setEditorMode('editor');
                            openFile(smell.filePath);
                          }}
                          className="flex items-start gap-2.5 p-2 bg-[#181d28] border border-panel-border rounded hover:border-slate-500 cursor-pointer transition-colors text-[11px]"
                        >
                          <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${isHigh ? 'text-red-400' : 'text-amber-400'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold">{smell.type}</span>
                              <span className="text-[9px] opacity-60">({smell.filePath}:{smell.lineNumber})</span>
                            </div>
                            <div className="text-panel-text mt-0.5 text-[10px]">{smell.description}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold p-4">
                      <ShieldCheck className="h-5 w-5" />
                      <span>Code smells check complete. Clean workspace!</span>
                    </div>
                  )}
                </div>
              )}

              {bottomTab === 'patterns' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-left select-text">
                  {patternsData?.detectedPatterns && patternsData.detectedPatterns.length > 0 ? (
                    patternsData.detectedPatterns.map((pat: any, i: number) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setEditorMode('editor');
                          openFile(pat.filePath);
                        }}
                        className="p-2.5 bg-[#181d28] border border-panel-border rounded hover:border-slate-500 cursor-pointer transition-colors text-[11px]"
                      >
                        <div className="text-brand-400 font-bold text-xs">{pat.patternName} Pattern</div>
                        <div className="text-white font-semibold mt-1 truncate">{pat.className}</div>
                        <div className="text-[10px] text-panel-text mt-1 truncate">File: {pat.filePath}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-panel-text/40 p-4">No structural patterns matched.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar (AI Copilot Chat Interface) */}
        <div className="w-[300px] border-l border-panel-border bg-panel-sidebar flex flex-col shrink-0 overflow-hidden relative select-none">
          <div className="h-9 border-b border-panel-border bg-[#0d1017] px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-mono font-bold text-white flex items-center gap-1"><Cpu className="h-3.5 w-3.5 text-brand-400" /> Copilot Chat</span>
            {activeConversationId && (
              <button 
                onClick={() => {
                  setChatMessages([]);
                  setActiveConversationId(null);
                }}
                className="text-[9px] font-mono hover:text-white px-1.5 py-0.5 border border-panel-border rounded bg-panel-bg cursor-pointer text-panel-text transition-colors"
              >
                Reset Chat
              </button>
            )}
          </div>

          {/* Messages block */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
            {chatMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center font-mono py-12 p-4">
                <MessageSquareCode className="h-8 w-8 text-panel-text/20 mb-3" />
                <p className="text-xs text-panel-text">AI Copilot initialized.</p>
                <p className="text-[10px] text-panel-text/45 mt-1">Ask questions about dependencies, design patterns, or refactoring smells.</p>
                
                {/* Prompt helpers */}
                <div className="mt-6 w-full space-y-2 text-left">
                  <button 
                    onClick={() => setChatInput('Summarize the workspace technology architecture and couplings.')}
                    className="w-full text-[10px] text-left text-panel-text hover:text-white p-2 bg-[#181d28] border border-panel-border rounded transition-colors cursor-pointer"
                  >
                    "Summarize workspace technology..."
                  </button>
                  <button 
                    onClick={() => setChatInput('List the detected design patterns and their confidence level.')}
                    className="w-full text-[10px] text-left text-panel-text hover:text-white p-2 bg-[#181d28] border border-panel-border rounded transition-colors cursor-pointer"
                  >
                    "List detected design patterns..."
                  </button>
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex flex-col text-left font-mono text-xs rounded-lg p-3 ${
                  msg.role === 'USER' 
                    ? 'bg-[#1e293b]/70 border border-panel-border/30 ml-8 text-white' 
                    : 'bg-panel-bg border border-panel-border mr-8 text-panel-text'
                }`}
              >
                <span className={`text-[9px] uppercase font-bold mb-1 ${msg.role === 'USER' ? 'text-brand-300' : 'text-[#a78bfa]'}`}>
                  {msg.role === 'USER' ? 'Developer' : 'Gemini AI'}
                </span>
                <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center gap-2 text-left font-mono text-xs text-panel-text bg-panel-bg p-3 border border-panel-border rounded-lg mr-8 animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* Prompt Entry Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-panel-border bg-[#0d1017] shrink-0">
            <div className="flex items-center gap-2 bg-[#181d28] border border-panel-border rounded px-2 py-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask assistant..."
                className="w-full bg-transparent focus:outline-none text-[11px] font-mono text-white placeholder-panel-text/40"
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="text-xs font-mono text-brand-400 hover:text-brand-300 disabled:opacity-30 cursor-pointer"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default WorkspaceIde;
