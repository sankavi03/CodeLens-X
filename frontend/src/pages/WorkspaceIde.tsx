import React, { useEffect, useState, useCallback, useRef } from 'react';
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

import { useToastStore } from '../hooks/useToastStore';
import { 
  Folder, MessageSquareCode, Activity, GitFork, BookOpen, 
  Loader2, Sparkles, Copy, Cpu, Code2, AlertTriangle, ShieldCheck,
  Download, Settings, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

interface CodeSmell {
  filePath: string;
  type: string;
  entityName: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  lineNumber: number;
}

interface DetectedPattern {
  patternName: string;
  className: string;
  filePath: string;
}

// Progressive Loader Component
export const ProgressiveLoader: React.FC<{ messages: string[] }> = ({ messages }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [messages]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 font-mono text-[11px] text-[#8B949E] py-8">
      <Loader2 className="h-5 w-5 animate-spin text-[#7C5CFC]" />
      <span className="animate-pulse">{messages[index]}</span>
    </div>
  );
};

// Custom Error Panel Component
export const ErrorPanel: React.FC<{ errorText: string; retryAction: () => void }> = ({ errorText, retryAction }) => {
  const addToast = useToastStore((state) => state.addToast);
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center font-mono py-12">
      <AlertTriangle className="h-8 w-8 text-[#EF4444] mb-3" />
      <p className="text-xs text-white font-bold">Generation Failed</p>
      <p className="text-[10px] text-[#8B949E] mt-1.5 max-w-xs break-words">{errorText}</p>
      <div className="flex gap-2 mt-4">
        <button
          onClick={retryAction}
          className="px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded text-[10px] font-semibold cursor-pointer transition-colors"
        >
          Retry Action
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(errorText);
            addToast("Copied error details.", "success");
          }}
          className="px-3 py-1.5 bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-white rounded text-[10px] cursor-pointer transition-colors"
        >
          Copy Details
        </button>
      </div>
    </div>
  );
};

export const WorkspaceIde: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const setPaletteOpen = useCommandStore((state) => state.setPaletteOpen);

  const {
    activeWorkspace, projectTree, openTabs, activeTab, 
    fileContent, isLoadingContent, 
    openFile, closeFile, setActiveTab, selectWorkspace,
    dirtyFiles, setFileDirty, saveFile, discardChanges, reloadFile,
    createFileOnDisk, createFolderOnDisk, renamePathOnDisk, deletePathOnDisk, fetchProjectTree
  } = useWorkspaceStore();

  const addToast = useToastStore((state) => state.addToast);
  const [architectureType, setArchitectureType] = useState<string>('flowchart');
  const [architectureCache, setArchitectureCache] = useState<Record<string, string>>({});

  // Layout states (in pixels)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('codelens_sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [copilotWidth, setCopilotWidth] = useState(() => {
    const saved = localStorage.getItem('codelens_copilot_width');
    return saved ? parseInt(saved, 10) : 300;
  });
  const [bottomHeight, setBottomHeight] = useState(() => {
    const saved = localStorage.getItem('codelens_bottom_height');
    return saved ? parseInt(saved, 10) : 200;
  });

  // Collapse indicators
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCopilotCollapsed, setIsCopilotCollapsed] = useState(false);
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);

  // Settings & conflicts & keyboard shortcuts
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    return localStorage.getItem('codelens_auto_save') === 'true';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [conflictState, setConflictState] = useState<{ path: string; message: string } | null>(null);

  // Error States
  const [readmeError, setReadmeError] = useState<string | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [archError, setArchError] = useState<string | null>(null);

  // Navigation Panel Switches: 'explorer' | 'copilot' | 'insights' | 'docs'
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

  // Explorer search & code outline
  const [explorerSearch, setExplorerSearch] = useState('');
  const [outlineData, setOutlineData] = useState<any>(null);
  const [isLoadingOutline, setIsLoadingOutline] = useState(false);
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(true);
  const editorRef = useRef<any>(null);

  // Load Outline data whenever activeTab changes
  useEffect(() => {
    if (!activeTab || !workspaceId) {
      setOutlineData(null);
      return;
    }
    setIsLoadingOutline(true);
    api.get(`/api/workspaces/${workspaceId}/outline`, { params: { path: activeTab } })
      .then(res => {
        setOutlineData(res.data);
      })
      .catch(() => setOutlineData(null))
      .finally(() => setIsLoadingOutline(false));
  }, [activeTab, workspaceId]);

  const handleOutlineItemClick = (name: string, type: string) => {
    if (!editorRef.current || !fileContent) return;
    
    let cleanName = name;
    if (type === 'method' || type === 'constructor' || type === 'function') {
      cleanName = name.replace(/^[^\s]+\s+/, '').replace(/\(.*/, '').trim();
    }
    
    const lines = fileContent.split('\n');
    let matchIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(cleanName)) {
        matchIdx = i;
        break;
      }
    }
    if (matchIdx !== -1) {
      const lineNum = matchIdx + 1;
      editorRef.current.revealLineInCenter(lineNum);
      editorRef.current.setPosition({ lineNumber: lineNum, column: 1 });
      editorRef.current.focus();
      addToast(`Jumped to ${cleanName}`, 'success');
    }
  };

  // Drag resizers
  const handleSidebarResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(150, Math.min(600, moveEvent.clientX - 48)); // 48px left activity bar
      setSidebarWidth(newWidth);
      localStorage.setItem('codelens_sidebar_width', newWidth.toString());
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCopilotResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(800, window.innerWidth - moveEvent.clientX));
      setCopilotWidth(newWidth);
      localStorage.setItem('codelens_copilot_width', newWidth.toString());
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleBottomResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = Math.max(100, Math.min(600, window.innerHeight - moveEvent.clientY));
      setBottomHeight(newHeight);
      localStorage.setItem('codelens_bottom_height', newHeight.toString());
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSidebarDoubleClick = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const handleCopilotDoubleClick = () => setIsCopilotCollapsed(!isCopilotCollapsed);
  const handleBottomDoubleClick = () => setIsBottomCollapsed(!isBottomCollapsed);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        setIsCopilotCollapsed(false);
        const chatInputEl = document.getElementById('chat-input-field');
        if (chatInputEl) chatInputEl.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Fetch all initial project details
  const loadAnalysisData = useCallback(async () => {
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
  }, [workspaceId]);

  // Save handling
  const handleSaveActiveFile = useCallback(async () => {
    if (!activeTab) return;
    try {
      await saveFile(activeTab);
      addToast('File saved successfully!', 'success');
      loadAnalysisData();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictState({
          path: activeTab,
          message: err.response.data.message || 'File conflict detected on disk.'
        });
      } else {
        addToast(err.response?.data?.message || 'Failed to save file.', 'error');
      }
    }
  }, [activeTab, saveFile, addToast, loadAnalysisData]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab && dirtyFiles[activeTab] !== undefined) {
          handleSaveActiveFile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, dirtyFiles, handleSaveActiveFile]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!autoSaveEnabled || !activeTab || dirtyFiles[activeTab] === undefined) return;
    const timer = setTimeout(() => {
      handleSaveActiveFile();
    }, 2000);
    return () => clearTimeout(timer);
  }, [dirtyFiles, activeTab, autoSaveEnabled, handleSaveActiveFile]);

  useEffect(() => {
    if (workspaceId) {
      api.get(`/api/workspaces/${workspaceId}`)
        .then((res) => {
          selectWorkspace(res.data);
          loadAnalysisData();
        })
        .catch(() => navigate('/dashboard'));
    }
  }, [workspaceId, selectWorkspace, navigate, loadAnalysisData]);

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
    } else if (action === 'new-file') {
      const fileName = prompt("Enter new file name (e.g., Service.java):");
      if (fileName) {
        const newPath = node.type === 'FOLDER' 
          ? `${node.relativePath}/${fileName}` 
          : `${node.relativePath.substring(0, node.relativePath.lastIndexOf('/'))}/${fileName}`;
        createFileOnDisk(newPath)
          .then(() => {
            addToast(`File ${fileName} created.`, 'success');
            loadAnalysisData();
          })
          .catch((err) => addToast(err.response?.data?.message || 'Failed to create file.', 'error'));
      }
    } else if (action === 'new-folder') {
      const folderName = prompt("Enter new folder name:");
      if (folderName) {
        const newPath = node.type === 'FOLDER' 
          ? `${node.relativePath}/${folderName}` 
          : `${node.relativePath.substring(0, node.relativePath.lastIndexOf('/'))}/${folderName}`;
        createFolderOnDisk(newPath)
          .then(() => {
            addToast(`Folder ${folderName} created.`, 'success');
            loadAnalysisData();
          })
          .catch((err) => addToast(err.response?.data?.message || 'Failed to create folder.', 'error'));
      }
    } else if (action === 'rename') {
      const newName = prompt("Enter new name:", node.name);
      if (newName && newName !== node.name) {
        const parentPath = node.relativePath.substring(0, node.relativePath.lastIndexOf('/'));
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;
        renamePathOnDisk(node.relativePath, newPath)
          .then(() => {
            addToast(`Renamed to ${newName}.`, 'success');
            loadAnalysisData();
          })
          .catch((err) => addToast(err.response?.data?.message || 'Failed to rename.', 'error'));
      }
    } else if (action === 'duplicate') {
      const dupName = prompt("Enter duplicate name:", `${node.name}_copy`);
      if (dupName) {
        const parentPath = node.relativePath.substring(0, node.relativePath.lastIndexOf('/'));
        const newPath = parentPath ? `${parentPath}/${dupName}` : dupName;
        if (node.type === 'FILE') {
          api.get(`/api/workspaces/${workspaceId}/file`, { params: { path: node.relativePath } })
            .then((res) => {
              createFileOnDisk(newPath).then(() => {
                api.put(`/api/workspaces/${workspaceId}/file`, { content: res.data.content, lastModified: 0 }, { params: { path: newPath } })
                  .then(() => {
                    fetchProjectTree(workspaceId!);
                    loadAnalysisData();
                    addToast(`Duplicated file to ${dupName}`, 'success');
                  });
              });
            })
            .catch(() => addToast("Failed to duplicate file.", "error"));
        } else {
          createFolderOnDisk(newPath)
            .then(() => {
              loadAnalysisData();
              addToast(`Duplicated folder created.`, 'success');
            });
        }
      }
    } else if (action === 'delete') {
      if (confirm(`Are you sure you want to delete ${node.name}?`)) {
        deletePathOnDisk(node.relativePath)
          .then(() => {
            addToast(`${node.name} deleted.`, 'success');
            loadAnalysisData();
            if (openTabs.includes(node.relativePath)) {
              closeFile(node.relativePath);
            }
          })
          .catch((err) => addToast(err.response?.data?.message || 'Failed to delete.', 'error'));
      }
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
    setDocsError(null);
    setEditorMode('generated-docs');
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/generator/docs`, null, {
        params: { path }
      });
      setDocContent(response.data.documentation);
    } catch (err: any) {
      setDocsError(err.response?.data?.message || 'Gemini API limit hit. Please retry shortly.');
    } finally {
      setGeneratingDocs(false);
    }
  };

  const handleGenerateReadme = async () => {
    setGeneratingReadme(true);
    setReadmeError(null);
    setEditorMode('readme');
    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/generator/readme`);
      setReadmeContent(response.data.readme);
    } catch (err: any) {
      setReadmeError(err.response?.data?.message || 'Failed to compile README via Gemini AI.');
    } finally {
      setGeneratingReadme(false);
    }
  };

  const handleGenerateArchitecture = async (typeToGen?: string) => {
    const targetType = typeToGen || architectureType;
    setGeneratingArch(true);
    setArchError(null);
    setEditorMode('architecture');
    
    if (architectureCache[targetType]) {
      setArchitectureContent(architectureCache[targetType]);
      setGeneratingArch(false);
      return;
    }

    try {
      const response = await api.post(`/api/workspaces/${workspaceId}/generator/architecture`, null, {
        params: { type: targetType }
      });
      const generated = response.data.architecture;
      setArchitectureContent(generated);
      setArchitectureCache((prev) => ({ ...prev, [targetType]: generated }));
      addToast('Architecture diagram generated!', 'success');
    } catch (err: any) {
      setArchError(err.response?.data?.message || 'Mermaid compiling graph failure. Check syntax.');
    } finally {
      setGeneratingArch(false);
    }
  };

  const handleCopyReadme = async () => {
    try {
      await navigator.clipboard.writeText(readmeContent);
      addToast('README copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy README.', 'error');
    }
  };

  const handleDownloadReadme = () => {
    try {
      const blob = new Blob([readmeContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'README.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('README.md downloaded!', 'success');
    } catch {
      addToast('Failed to download README.md.', 'error');
    }
  };

  const handleCopyDocs = async () => {
    try {
      await navigator.clipboard.writeText(docContent);
      addToast('Documentation copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy documentation.', 'error');
    }
  };

  const handleDownloadDocs = () => {
    try {
      const blob = new Blob([docContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'DOCUMENTATION.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('DOCUMENTATION.md downloaded!', 'success');
    } catch {
      addToast('Failed to download DOCUMENTATION.md.', 'error');
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
      console.error('Chat error:', err);
      setChatMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), role: 'ASSISTANT', content: 'Connection timed out. Please check backend status.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

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

  const handleSidebarIconClick = (sidebarTab: 'explorer' | 'copilot' | 'insights' | 'docs') => {
    if (activeSidebar === sidebarTab) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    } else {
      setActiveSidebar(sidebarTab);
      setIsSidebarCollapsed(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0D1117] font-sans antialiased text-[#e2e8f0] relative select-none">
      
      <CommandPalette />
      
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          node={contextMenu.node} 
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}

      {/* Hidden triggers */}
      <button id="explain-btn-trigger" className="hidden" onClick={() => activeTab && handleExplainFile(activeTab)}></button>
      <button id="docs-btn-trigger" className="hidden" onClick={() => activeTab && handleGenerateDocs(activeTab)}></button>
      <button id="readme-btn-trigger" className="hidden" onClick={handleGenerateReadme}></button>
      
      <button id="tab-stats-trigger" className="hidden" onClick={() => { setBottomTab('stats'); }}></button>
      <button id="tab-insights-trigger" className="hidden" onClick={() => { setBottomTab('insights'); }}></button>
      <button id="tab-patterns-trigger" className="hidden" onClick={() => { setBottomTab('patterns'); }}></button>
      
      <button id="tab-graph-trigger" className="hidden" onClick={() => { setEditorMode('graph'); }}></button>

      {/* Top Command Bar */}
      <div className="flex h-12 w-full items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC]">
            <Cpu className="h-4 w-4" />
          </div>
          <span className="font-mono text-xs font-bold tracking-tight text-white flex items-center gap-0.5">
            CodeLens <span className="text-[#7C5CFC]">X</span>
          </span>
          <span className="h-4 w-px bg-[#30363D] mx-2"></span>
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#8B949E]">
            <span>Workspace:</span>
            <span className="text-white font-bold">{activeWorkspace?.projectName}</span>
            {activeTab && (
              <>
                <ChevronRight className="h-3 w-3 text-[#30363D]" />
                <span className="text-white truncate max-w-[200px]">{activeTab}</span>
              </>
            )}
          </div>
        </div>

        {/* Command Search Bar */}
        <div 
          onClick={() => setPaletteOpen(true)}
          className="bg-[#0D1117] hover:bg-[#21262D] border border-[#30363D] px-3 py-1 rounded text-[11px] font-mono text-[#8B949E] flex items-center gap-4 cursor-pointer select-none transition-colors"
        >
          <span>Search or run commands...</span>
          <span className="opacity-50 text-[10px] bg-[#161B22] px-1 py-0.5 rounded border border-[#30363D]">Ctrl + Shift + P</span>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <button 
            onClick={() => setIsCopilotCollapsed(!isCopilotCollapsed)}
            className={`hover:text-white px-2.5 py-1 border border-[#30363D] rounded cursor-pointer transition-colors flex items-center gap-1.5 ${!isCopilotCollapsed ? 'bg-[#21262D] text-white border-[#7C5CFC]' : 'bg-[#161B22]/50 text-[#8B949E]'}`}
            title="Toggle Copilot Chat Panel (Ctrl + L)"
          >
            <MessageSquareCode className="h-3.5 w-3.5 text-[#7C5CFC]" />
            <span>Copilot Chat</span>
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="hover:text-white px-2.5 py-1 border border-[#30363D] bg-[#161B22]/50 rounded cursor-pointer transition-colors flex items-center gap-1.5 text-[#8B949E]"
            title="Open preferences settings"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="hover:text-white px-2.5 py-1 border border-[#30363D] bg-[#161B22]/50 rounded cursor-pointer transition-colors text-[#8B949E]"
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="flex flex-1 w-full overflow-hidden relative">
        
        {/* Left Activity Bar */}
        <div className="w-12 border-r border-[#30363D] bg-[#0d0e12] flex flex-col items-center py-4 justify-between shrink-0 select-none">
          <div className="flex flex-col gap-5 text-[#8B949E]">
            <button 
              onClick={() => handleSidebarIconClick('explorer')}
              className={`p-2 hover:text-white hover:bg-[#161B22] rounded-lg transition-all cursor-pointer ${activeSidebar === 'explorer' && !isSidebarCollapsed ? 'text-[#7C5CFC] bg-[#7C5CFC]/5 border-l-2 border-[#7C5CFC] rounded-l-none pl-1.5' : ''}`}
              title="File Explorer"
            >
              <Folder className="h-5 w-5" />
            </button>
            <button 
              onClick={() => handleSidebarIconClick('copilot')}
              className={`p-2 hover:text-white hover:bg-[#161B22] rounded-lg transition-all cursor-pointer ${activeSidebar === 'copilot' && !isSidebarCollapsed ? 'text-[#7C5CFC] bg-[#7C5CFC]/5 border-l-2 border-[#7C5CFC] rounded-l-none pl-1.5' : ''}`}
              title="AI Assistant Chat"
            >
              <MessageSquareCode className="h-5 w-5" />
            </button>
            <button 
              onClick={() => handleSidebarIconClick('insights')}
              className={`p-2 hover:text-white hover:bg-[#161B22] rounded-lg transition-all cursor-pointer ${activeSidebar === 'insights' && !isSidebarCollapsed ? 'text-[#7C5CFC] bg-[#7C5CFC]/5 border-l-2 border-[#7C5CFC] rounded-l-none pl-1.5' : ''}`}
              title="Project Insights"
            >
              <Activity className="h-5 w-5" />
            </button>
            <button 
              onClick={() => handleSidebarIconClick('docs')}
              className={`p-2 hover:text-white hover:bg-[#161B22] rounded-lg transition-all cursor-pointer ${activeSidebar === 'docs' && !isSidebarCollapsed ? 'text-[#7C5CFC] bg-[#7C5CFC]/5 border-l-2 border-[#7C5CFC] rounded-l-none pl-1.5' : ''}`}
              title="Doc Generators"
            >
              <BookOpen className="h-5 w-5" />
            </button>
          </div>
          
          <button 
            onClick={() => setEditorMode('graph')}
            className={`p-2 text-[#8B949E] hover:text-white hover:bg-[#161B22] rounded-lg transition-all cursor-pointer ${editorMode === 'graph' ? 'text-[#7C5CFC]' : ''}`}
            title="Dependency Network"
          >
            <GitFork className="h-5 w-5" />
          </button>
        </div>

        {/* Resizable Sidebar panels */}
        {!isSidebarCollapsed && (
          <div 
            style={{ width: sidebarWidth }}
            className="border-r border-[#30363D] bg-[#161B22] flex flex-col shrink-0 select-none overflow-hidden"
          >
            {activeSidebar === 'explorer' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-[#30363D]/40 shrink-0">
                  <div className="text-[10px] font-mono font-bold tracking-wider text-[#8B949E] uppercase mb-2">Workspace Files</div>
                  <input
                    type="text"
                    value={explorerSearch}
                    onChange={(e) => setExplorerSearch(e.target.value)}
                    placeholder="Filter by name..."
                    className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none px-2.5 py-1.5 rounded text-[11px] font-mono text-white placeholder-[#8B949E]/40"
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
                    <div className="text-[11px] font-mono text-[#8B949E]/50 p-4 text-center">Empty directory or searching...</div>
                  )}
                </div>

                {/* Outline Accordion Panel */}
                <div className="border-t border-[#30363D] shrink-0 select-none">
                  <div 
                    onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
                    className="h-8 bg-[#0D1117] hover:bg-[#161B22] border-b border-[#30363D]/40 px-4 flex items-center justify-between text-[10px] font-mono font-bold uppercase text-[#8B949E] cursor-pointer"
                  >
                    <span>Code Outline</span>
                    <span>{isOutlineExpanded ? '▼' : '▶'}</span>
                  </div>
                  {isOutlineExpanded && (
                    <div className="max-h-60 overflow-y-auto p-3 font-mono text-[10px] space-y-2 select-text text-left">
                      {isLoadingOutline ? (
                        <div className="flex items-center gap-1.5 text-[#8B949E]/55 p-2">
                          <Loader2 className="h-3 w-3 animate-spin text-[#7C5CFC]" />
                          <span>Mapping features...</span>
                        </div>
                      ) : outlineData && (
                        (outlineData.packageName || 
                         (outlineData.classes && outlineData.classes.length > 0) || 
                         (outlineData.interfaces && outlineData.interfaces.length > 0) || 
                         (outlineData.methods && outlineData.methods.length > 0) || 
                         (outlineData.functions && outlineData.functions.length > 0))
                      ) ? (
                        <div className="space-y-1.5">
                          {outlineData.packageName && (
                            <div className="text-[#8B949E] italic truncate" title={outlineData.packageName}>
                              package {outlineData.packageName}
                            </div>
                          )}
                          
                          {/* Classes */}
                          {outlineData.classes && outlineData.classes.map((cls: string) => (
                            <div 
                              key={cls}
                              onClick={() => handleOutlineItemClick(cls, 'class')}
                              className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#21262D] cursor-pointer text-[#e1b07e] font-semibold truncate"
                              title={cls}
                            >
                              <Code2 className="h-3 w-3 text-orange-400 shrink-0" />
                              <span>{cls}</span>
                            </div>
                          ))}

                          {/* Interfaces */}
                          {outlineData.interfaces && outlineData.interfaces.map((intf: string) => (
                            <div 
                              key={intf}
                              onClick={() => handleOutlineItemClick(intf, 'interface')}
                              className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#21262D] cursor-pointer text-emerald-400 font-semibold truncate"
                              title={intf}
                            >
                              <BookOpen className="h-3 w-3 text-emerald-400 shrink-0" />
                              <span>{intf}</span>
                            </div>
                          ))}

                          {/* Constructors */}
                          {outlineData.constructors && outlineData.constructors.map((cst: string) => (
                            <div 
                              key={cst}
                              onClick={() => handleOutlineItemClick(cst, 'constructor')}
                              className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#21262D] cursor-pointer text-[#8b5cf6] truncate pl-2"
                              title={cst}
                            >
                              <Cpu className="h-3 w-3 text-indigo-400 shrink-0" />
                              <span>{cst}</span>
                            </div>
                          ))}

                          {/* Methods */}
                          {outlineData.methods && outlineData.methods.map((mtd: string) => (
                            <div 
                              key={mtd}
                              onClick={() => handleOutlineItemClick(mtd, 'method')}
                              className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#21262D] cursor-pointer text-blue-300 truncate pl-3"
                              title={mtd}
                            >
                              <Settings className="h-3 w-3 text-blue-400 shrink-0" />
                              <span>{mtd}</span>
                            </div>
                          ))}

                          {/* Functions */}
                          {outlineData.functions && outlineData.functions.map((func: string) => (
                            <div 
                              key={func}
                              onClick={() => handleOutlineItemClick(func, 'function')}
                              className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#21262D] cursor-pointer text-[#c9d1d9] truncate pl-3"
                              title={func}
                            >
                              <Settings className="h-3 w-3 text-purple-400 shrink-0" />
                              <span>{func}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[#8B949E]/40 italic text-center py-4">No outline symbols parsed.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSidebar === 'copilot' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-[#30363D]/40 shrink-0 font-mono">
                  <div className="text-[10px] font-bold tracking-wider text-[#8B949E] uppercase">AI Code Explanations</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 select-text text-left font-mono">
                  {activeTab ? (
                    <div className="space-y-4">
                      <div className="bg-[#0D1117] p-3 border border-[#30363D] rounded text-[11px]">
                        <div className="text-[#8B949E] mb-1.5">Selected file:</div>
                        <div className="text-white font-bold truncate">{activeTab.split('/').pop()}</div>
                      </div>
                      <button
                        onClick={() => handleExplainFile(activeTab)}
                        disabled={explainingFile}
                        className="w-full bg-[#7C5CFC] hover:bg-[#6845f9] disabled:opacity-50 text-white font-medium py-2 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
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
                    <div className="text-[11px] text-[#8B949E]/50 text-center py-10">Select a file in explorer to query AI explanations.</div>
                  )}
                </div>
              </div>
            )}

            {activeSidebar === 'insights' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-[#30363D]/40 shrink-0 font-mono">
                  <div className="text-[10px] font-bold tracking-wider text-[#8B949E] uppercase">Project Health overview</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-left">
                  {statsData ? (
                    <>
                      <div className="bg-[#0D1117] p-3 border border-[#30363D] rounded text-[11px] space-y-2">
                        <div className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-[#30363D]/30 pb-1">Codebase Summary</div>
                        <div>Total Files: <span className="text-white font-bold">{statsData.totalFiles}</span></div>
                        <div>Total Folders: <span className="text-white font-bold">{statsData.totalFolders}</span></div>
                        <div>Lines of Code: <span className="text-brand-300 font-bold">{statsData.codeLines}</span></div>
                      </div>
                      
                      {patternsData?.detectedPatterns && (
                        <div className="bg-[#0D1117] p-3 border border-[#30363D] rounded text-[11px]">
                          <div className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-[#30363D]/30 pb-1 mb-2">Patterns Detected</div>
                          <div className="space-y-1">
                            {patternsData.detectedPatterns.map((pat: DetectedPattern, i: number) => (
                              <div key={i} className="text-[#a78bfa] font-bold">
                                • {pat.patternName} <span className="text-[9px] opacity-60 text-[#8B949E]">({pat.className})</span>
                              </div>
                            ))}
                            {patternsData.detectedPatterns.length === 0 && <div className="text-[#8B949E]/50 text-[10px]">No patterns parsed.</div>}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-[#8B949E]/50 text-center py-10">Waiting for statistics to parse...</div>
                  )}
                </div>
              </div>
            )}

            {activeSidebar === 'docs' && (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-[#30363D]/40 shrink-0 font-mono">
                  <div className="text-[10px] font-bold tracking-wider text-[#8B949E] uppercase">Generators</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
                  <button
                    onClick={handleGenerateReadme}
                    disabled={generatingReadme}
                    className="w-full bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs py-2 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {generatingReadme ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4 text-[#7C5CFC]" />}
                    <span>Generate README.md</span>
                  </button>
                  <button
                    onClick={() => handleGenerateArchitecture()}
                    disabled={generatingArch}
                    className="w-full bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-white text-xs py-2 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {generatingArch ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitFork className="h-4 w-4 text-[#22C55E]" />}
                    <span>Generate Architecture</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sidebar Vertical Resizer */}
        {!isSidebarCollapsed && (
          <div 
            onMouseDown={handleSidebarResizeMouseDown}
            onDoubleClick={handleSidebarDoubleClick}
            className="w-1 hover:w-1.5 active:w-1.5 bg-transparent hover:bg-[#7C5CFC] active:bg-[#7C5CFC] cursor-col-resize h-full transition-all duration-100 z-30 select-none shrink-0"
          />
        )}

        {/* Center Panel (Tabs, Editor or visual mappings) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0D1117] relative">
          
          {/* Tab bar header */}
          <div className="h-9 w-full border-b border-[#30363D] bg-[#161B22] flex items-center justify-between shrink-0 select-none overflow-hidden">
            <div className="flex items-center h-full overflow-x-auto overflow-y-hidden">
              {openTabs.map((tab) => (
                <div
                  key={tab}
                  onClick={() => {
                    setEditorMode('editor');
                    setActiveTab(tab);
                  }}
                  className={`h-full flex items-center gap-2 px-3 border-r border-[#30363D] text-[11px] font-mono cursor-pointer transition-colors ${
                    activeTab === tab && editorMode === 'editor'
                      ? 'bg-[#0D1117] text-white border-t-2 border-[#7C5CFC] font-semibold'
                      : 'bg-[#161B22] hover:bg-[#21262D] text-[#8B949E]'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{tab.split('/').pop()}</span>
                  {dirtyFiles[tab] !== undefined && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] shrink-0" />
                  )}
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      closeFile(tab);
                    }}
                    className="hover:text-[#EF4444] hover:bg-[#21262D] px-1 rounded text-xs leading-none"
                  >
                    ×
                  </span>
                </div>
              ))}

              {/* Extra visualization tabs */}
              {editorMode !== 'editor' && (
                <div className="h-full flex items-center gap-1.5 px-3 border-r border-[#30363D] bg-[#0D1117] text-xs font-mono font-bold text-white border-t-2 border-[#7C5CFC] select-none">
                  <span>Visual Preview: {editorMode.toUpperCase()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-4 text-[#8B949E] font-mono text-[10px]">
              {editorMode === 'editor' && activeTab && (
                <span className="text-[#22C55E] font-semibold uppercase">{activeTab.split('.').pop()} FILE</span>
              )}
            </div>
          </div>

          {/* Central Main Content block */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {editorMode === 'editor' && (
              <>
                {activeTab ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Monaco Editor Toolbar */}
                    <div className="h-8 w-full border-b border-[#30363D] bg-[#161B22] px-4 flex items-center justify-between select-none shrink-0 text-[11px] font-mono text-[#8B949E]">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-white font-bold">{activeTab.split('/').pop()}</span>
                        {dirtyFiles[activeTab] !== undefined && (
                          <span className="text-[#F59E0B] font-semibold flex items-center gap-1">
                            ● <span className="text-[10px]">(unsaved changes)</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {dirtyFiles[activeTab] !== undefined ? (
                          <>
                            <button
                              onClick={handleSaveActiveFile}
                              className="px-2 py-0.5 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded font-medium cursor-pointer transition-colors"
                            >
                              Save (Ctrl+S)
                            </button>
                            <button
                              onClick={() => discardChanges(activeTab)}
                              className="px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded border border-[#30363D] cursor-pointer transition-colors"
                            >
                              Discard
                            </button>
                          </>
                        ) : (
                          <button
                            disabled
                            className="px-2 py-0.5 bg-[#21262D] opacity-40 text-[#8B949E] rounded border border-[#30363D] cursor-not-allowed"
                          >
                            Saved
                          </button>
                        )}
                        <span className="h-3 w-px bg-[#30363D]" />
                        <button
                          onClick={async () => {
                            try {
                              await reloadFile(activeTab);
                              addToast('File reloaded from disk.', 'success');
                            } catch {
                              addToast('Failed to reload file.', 'error');
                            }
                          }}
                          className="px-2 py-0.5 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded border border-[#30363D] cursor-pointer transition-colors"
                        >
                          Reload
                        </button>
                      </div>
                    </div>

                    {isLoadingContent ? (
                      <div className="flex-1 flex items-center justify-center bg-[#0D1117]">
                        <div className="flex flex-col items-center gap-2 text-xs font-mono text-[#8B949E]">
                          <Loader2 className="h-6 w-6 animate-spin text-[#7C5CFC]" />
                          <span>Decrypting file bytes...</span>
                        </div>
                      </div>
                    ) : (
                      <MonacoEditor
                        height="100%"
                        language={activeTab.split('.').pop()?.toLowerCase() === 'py' ? 'python' : 'java'}
                        theme="vs-dark"
                        value={fileContent || ''}
                        onChange={(val) => {
                          if (activeTab && val !== undefined) {
                            setFileDirty(activeTab, val);
                          }
                        }}
                        onMount={(editor) => {
                          editorRef.current = editor;
                        }}
                        options={{
                          readOnly: false,
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
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono p-6">
                    <Code2 className="h-10 w-10 text-[#8B949E]/20 mb-3" />
                    <p className="text-sm text-[#8B949E]">No File Opened</p>
                    <p className="text-xs text-[#8B949E]/45 mt-1.5 max-w-xs">Double click files in the Explorer tree to inspect code structure.</p>
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
                  <div className="w-full h-full flex items-center justify-center text-xs font-mono text-[#8B949E]">
                    Calculating internal couplings...
                  </div>
                )}
              </div>
            )}

            {editorMode === 'architecture' && (
              <div className="flex flex-col w-full h-full min-h-0 bg-[#0D1117]">
                <div className="flex items-center justify-between border-b border-[#30363D]/30 px-4 py-2 bg-[#161B22] shrink-0 overflow-x-auto gap-4">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-[#8B949E] uppercase">Diagram Type:</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono select-none">
                    {[
                      { id: 'flowchart', label: 'Flowchart' },
                      { id: 'class_diagram', label: 'Class' },
                      { id: 'sequence_diagram', label: 'Sequence' },
                      { id: 'dependency_graph', label: 'Dependencies' },
                      { id: 'package_diagram', label: 'Package' },
                      { id: 'component_diagram', label: 'Component' },
                      { id: 'deployment_diagram', label: 'Deployment' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setArchitectureType(t.id);
                          handleGenerateArchitecture(t.id);
                        }}
                        className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          architectureType === t.id
                            ? 'bg-[#7C5CFC]/20 border-[#7C5CFC] text-white font-semibold'
                            : 'bg-[#0D1117] border-[#30363D] text-[#8B949E] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 min-h-0 relative p-4 bg-[#0D1117]">
                  {generatingArch ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D1117]/95">
                      <ProgressiveLoader messages={["Parsing repository workspace...", "Building dependency graph mapping...", "Running Gemini AI architecture model...", "Rendering raw Mermaid visualizations..."]} />
                    </div>
                  ) : archError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D1117]/95">
                      <ErrorPanel errorText={archError} retryAction={() => handleGenerateArchitecture()} />
                    </div>
                  ) : (
                    <MermaidViewer chartCode={architectureContent} />
                  )}
                </div>
              </div>
            )}

            {editorMode === 'readme' && (
              <div className="w-full h-full p-8 overflow-y-auto select-text text-left font-mono text-sm leading-relaxed prose prose-invert bg-[#0D1117] flex flex-col">
                <div className="flex items-center justify-between border-b border-[#30363D]/30 pb-3 mb-6 shrink-0">
                  <h1 className="text-lg font-bold text-white flex items-center gap-1.5"><BookOpen className="h-5 w-5 text-[#7C5CFC]" /> README Preview</h1>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopyReadme}
                      className="flex items-center gap-1.5 hover:text-white px-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-xs text-[#8B949E] cursor-pointer transition-colors"
                      title="Copy README Markdown"
                    >
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                    <button 
                      onClick={handleDownloadReadme}
                      className="flex items-center gap-1.5 hover:text-white px-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-xs text-[#8B949E] cursor-pointer transition-colors"
                      title="Download README.md"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  {generatingReadme ? (
                    <ProgressiveLoader messages={["Inspecting code folders...", "Gathering classes definitions...", "Querying Gemini AI markdown summarizer...", "Formatting README markdown..."]} />
                  ) : readmeError ? (
                    <ErrorPanel errorText={readmeError} retryAction={handleGenerateReadme} />
                  ) : readmeContent ? (
                    <pre className="whitespace-pre-wrap font-sans text-xs bg-[#161B22] p-6 border border-[#30363D] rounded-lg text-[#8B949E] select-text">{readmeContent}</pre>
                  ) : (
                    <div className="text-xs text-[#8B949E]/50">Click 'Generate README' to compile repository overview.</div>
                  )}
                </div>
              </div>
            )}

            {editorMode === 'generated-docs' && (
              <div className="w-full h-full p-8 overflow-y-auto select-text text-left font-mono text-sm leading-relaxed bg-[#0D1117] flex flex-col">
                <div className="flex items-center justify-between border-b border-[#30363D]/30 pb-3 mb-6 shrink-0">
                  <h1 className="text-lg font-bold text-white flex items-center gap-1.5"><BookOpen className="h-5 w-5 text-[#22C55E]" /> Generated Documentation</h1>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleCopyDocs}
                      className="flex items-center gap-1.5 hover:text-white px-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-xs text-[#8B949E] cursor-pointer transition-colors"
                      title="Copy Documentation Markdown"
                    >
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                    <button 
                      onClick={handleDownloadDocs}
                      className="flex items-center gap-1.5 hover:text-white px-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded text-xs text-[#8B949E] cursor-pointer transition-colors"
                      title="Download DOCUMENTATION.md"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  {generatingDocs ? (
                    <ProgressiveLoader messages={["Reading source code structures...", "Extracting file outline components...", "Querying Gemini AI doc generator...", "Finalizing API guidelines..."]} />
                  ) : docsError ? (
                    <ErrorPanel errorText={docsError} retryAction={() => activeTab && handleGenerateDocs(activeTab)} />
                  ) : docContent ? (
                    <pre className="whitespace-pre-wrap font-sans text-xs bg-[#161B22] p-6 border border-[#30363D] rounded-lg text-[#8B949E] select-text">{docContent}</pre>
                  ) : (
                    <div className="text-xs text-[#8B949E]/50">Select a file context menu action 'Generate Docs' to compile API guidelines.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel Vertical Resizer */}
          {!isBottomCollapsed && (
            <div 
              onMouseDown={handleBottomResizeMouseDown}
              onDoubleClick={handleBottomDoubleClick}
              className="h-1 hover:h-1.5 active:h-1.5 bg-transparent hover:bg-[#7C5CFC] active:bg-[#7C5CFC] cursor-row-resize w-full transition-all duration-100 z-30 select-none shrink-0"
            />
          )}

          {/* Bottom Panel (Insights, Stats, Patterns) */}
          {!isBottomCollapsed && (
            <div 
              style={{ height: bottomHeight }}
              className="border-t border-[#30363D] bg-[#161B22] flex flex-col shrink-0 overflow-hidden relative"
            >
              <div className="h-8 border-b border-[#30363D]/50 px-4 bg-[#0d1017] flex items-center gap-4 text-xs font-mono select-none shrink-0">
                <button
                  onClick={() => setBottomTab('stats')}
                  className={`py-1 border-b-2 hover:text-white transition-colors cursor-pointer ${
                    bottomTab === 'stats' ? 'border-[#7C5CFC] text-white font-bold' : 'border-transparent text-[#8B949E]'
                  }`}
                >
                  Statistics
                </button>
                <button
                  onClick={() => setBottomTab('insights')}
                  className={`py-1 border-b-2 hover:text-white transition-colors cursor-pointer ${
                    bottomTab === 'insights' ? 'border-[#7C5CFC] text-white font-bold' : 'border-transparent text-[#8B949E]'
                  }`}
                >
                  Code Smells
                </button>
                <button
                  onClick={() => setBottomTab('patterns')}
                  className={`py-1 border-b-2 hover:text-white transition-colors cursor-pointer ${
                    bottomTab === 'patterns' ? 'border-[#7C5CFC] text-white font-bold' : 'border-transparent text-[#8B949E]'
                  }`}
                >
                  Design Patterns
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {bottomTab === 'stats' && (
                  <div className="grid grid-cols-12 h-full gap-4">
                    <div className="col-span-12 md:col-span-6 h-full flex flex-col">
                      <span className="text-[10px] font-mono text-[#8B949E] uppercase font-bold mb-1 border-b border-[#30363D]/30 pb-0.5">Language Percentages</span>
                      <div className="flex-1 h-full min-h-[90px] relative">
                        {languageChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={languageChartData}>
                              <XAxis dataKey="name" stroke="#8B949E" fontSize={9} tickLine={false} />
                              <YAxis stroke="#8B949E" fontSize={9} tickLine={false} />
                              <Tooltip contentStyle={{ background: '#161B22', border: 'none', borderRadius: 4 }} />
                              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                                {languageChartData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={['#7C5CFC', '#6366f1', '#3b82f6', '#22C55E'][index % 4]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#8B949E]/40">No stats loaded.</div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6 h-full flex flex-col">
                      <span className="text-[10px] font-mono text-[#8B949E] uppercase font-bold mb-1 border-b border-[#30363D]/30 pb-0.5">File Size Distribution</span>
                      <div className="flex-1 h-full min-h-[90px] relative">
                        {sizeChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sizeChartData}>
                              <XAxis dataKey="name" stroke="#8B949E" fontSize={9} tickLine={false} />
                              <YAxis stroke="#8B949E" fontSize={9} tickLine={false} />
                              <Tooltip contentStyle={{ background: '#161B22', border: 'none', borderRadius: 4 }} />
                              <Bar dataKey="files" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#8B949E]/40">No stats loaded.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {bottomTab === 'insights' && (
                  <div className="font-mono text-left space-y-2 select-text">
                    {insightsData?.codeSmells && insightsData.codeSmells.length > 0 ? (
                      insightsData.codeSmells.map((smell: CodeSmell, i: number) => {
                        const isHigh = smell.severity === 'High';
                        return (
                          <div 
                            key={i} 
                            onClick={() => {
                              setEditorMode('editor');
                              openFile(smell.filePath);
                            }}
                            className="flex items-start gap-2.5 p-2 bg-[#0D1117] border border-[#30363D] rounded hover:border-[#8B949E] cursor-pointer transition-colors text-[11px]"
                          >
                            <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${isHigh ? 'text-red-400' : 'text-amber-400'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold">{smell.type}</span>
                                <span className="text-[9px] opacity-60">({smell.filePath}:{smell.lineNumber})</span>
                              </div>
                              <div className="text-[#8B949E] mt-0.5 text-[10px]">{smell.description}</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-[#22C55E] font-bold p-4">
                        <ShieldCheck className="h-5 w-5" />
                        <span>Code smells check complete. Clean workspace!</span>
                      </div>
                    )}
                  </div>
                )}

                {bottomTab === 'patterns' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-left select-text">
                    {patternsData?.detectedPatterns && patternsData.detectedPatterns.length > 0 ? (
                      patternsData.detectedPatterns.map((pat: DetectedPattern, i: number) => (
                        <div 
                          key={i} 
                          onClick={() => {
                            setEditorMode('editor');
                            openFile(pat.filePath);
                          }}
                          className="p-2.5 bg-[#0D1117] border border-[#30363D] rounded hover:border-[#8B949E] cursor-pointer transition-colors text-[11px]"
                        >
                          <div className="text-[#7C5CFC] font-bold text-xs">{pat.patternName} Pattern</div>
                          <div className="text-white font-semibold mt-1 truncate">{pat.className}</div>
                          <div className="text-[10px] text-[#8B949E] mt-1 truncate">File: {pat.filePath}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-[#8B949E]/40 p-4">No structural patterns matched.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Resizer Handle */}
        {!isCopilotCollapsed && (
          <div 
            onMouseDown={handleCopilotResizeMouseDown}
            onDoubleClick={handleCopilotDoubleClick}
            className="w-1 hover:w-1.5 active:w-1.5 bg-transparent hover:bg-[#7C5CFC] active:bg-[#7C5CFC] cursor-col-resize h-full transition-all duration-100 z-30 select-none shrink-0"
          />
        )}

        {/* Right Sidebar (AI Copilot Chat Interface) */}
        {!isCopilotCollapsed && (
          <div 
            style={{ width: copilotWidth }}
            className="border-l border-[#30363D] bg-[#161B22] flex flex-col shrink-0 overflow-hidden relative select-none"
          >
            <div className="h-9 border-b border-[#30363D] bg-[#0d1017] px-4 flex items-center justify-between shrink-0 font-mono text-xs">
              <span className="text-white font-bold flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-[#7C5CFC]" /> Copilot Chat
              </span>
              <div className="flex items-center gap-2">
                {activeConversationId && (
                  <button 
                    onClick={() => {
                      setChatMessages([]);
                      setActiveConversationId(null);
                    }}
                    className="text-[9px] font-mono hover:text-white px-1.5 py-0.5 border border-[#30363D] rounded bg-[#0D1117] cursor-pointer text-[#8B949E] transition-colors"
                  >
                    Reset Chat
                  </button>
                )}
                <button 
                  onClick={() => setIsCopilotCollapsed(true)} 
                  className="hover:text-white text-[#8B949E] text-xs p-1"
                  title="Collapse Panel (Ctrl + L)"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center font-mono py-12 p-4">
                  <MessageSquareCode className="h-8 w-8 text-[#8B949E]/20 mb-3" />
                  <p className="text-xs text-[#8B949E]">AI Copilot initialized.</p>
                  <p className="text-[10px] text-[#8B949E]/45 mt-1">Ask questions about dependencies, design patterns, or refactoring smells.</p>
                  
                  {/* Prompt helpers */}
                  <div className="mt-6 w-full space-y-2 text-left">
                    <button 
                      onClick={() => setChatInput('Summarize the workspace technology architecture and couplings.')}
                      className="w-full text-[10px] text-left text-[#8B949E] hover:text-white p-2 bg-[#0D1117] border border-[#30363D] rounded transition-colors cursor-pointer"
                    >
                      "Summarize workspace technology..."
                    </button>
                    <button 
                      onClick={() => setChatInput('List the detected design patterns and their confidence level.')}
                      className="w-full text-[10px] text-left text-[#8B949E] hover:text-white p-2 bg-[#0D1117] border border-[#30363D] rounded transition-colors cursor-pointer"
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
                      ? 'bg-[#1e293b]/70 border border-[#30363D]/30 ml-8 text-white' 
                      : 'bg-[#0D1117] border border-[#30363D] mr-8 text-[#8B949E]'
                  }`}
                >
                  <span className={`text-[9px] uppercase font-bold mb-1 ${msg.role === 'USER' ? 'text-brand-300' : 'text-[#a78bfa]'}`}>
                    {msg.role === 'USER' ? 'Developer' : 'Gemini AI'}
                  </span>
                  <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-left font-mono text-xs text-[#8B949E] bg-[#0D1117] p-3 border border-[#30363D] rounded-lg mr-8 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7C5CFC]" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>

            {/* Prompt Entry Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-[#30363D] bg-[#0d1017] shrink-0">
              <div className="flex items-center gap-2 bg-[#0D1117] border border-[#30363D] rounded px-2 py-1">
                <input
                  id="chat-input-field"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask assistant... (Ctrl+L)"
                  className="w-full bg-transparent focus:outline-none text-[11px] font-mono text-white placeholder-[#8B949E]/40"
                />
                <button 
                  type="submit" 
                  disabled={chatLoading || !chatInput.trim()}
                  className="text-xs font-mono text-[#7C5CFC] hover:text-[#6845f9] disabled:opacity-30 cursor-pointer"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-mono select-none">
          <div className="bg-[#161B22] border border-[#30363D] w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="h-10 border-b border-[#30363D] bg-[#0d1017] px-4 flex items-center justify-between text-xs text-white font-bold">
              <span>User Preferences & Settings</span>
              <button onClick={() => setIsSettingsOpen(false)} className="hover:text-[#EF4444] text-xs">×</button>
            </div>
            <div className="p-4 space-y-4 text-xs text-[#8B949E]">
              <div className="flex items-center justify-between border-b border-[#30363D]/40 pb-3">
                <div>
                  <div className="text-white font-bold mb-0.5">Auto Save Changes</div>
                  <div className="text-[10px] text-[#8B949E]/70">Automatically write changes to disk after 2s of typing inactivity.</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setAutoSaveEnabled(enabled);
                    localStorage.setItem('codelens_auto_save', enabled.toString());
                    addToast(`Auto Save turned ${enabled ? 'ON' : 'OFF'}`, 'success');
                  }}
                  className="h-4 w-4 rounded accent-[#7C5CFC] cursor-pointer"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-1.5 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded font-medium cursor-pointer transition-colors"
                >
                  Close Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-mono select-none animate-fade-in">
          <div className="bg-[#161B22] border border-[#30363D] w-full max-w-sm rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="h-10 border-b border-[#30363D] bg-[#0d1017] px-4 flex items-center justify-between text-xs text-white font-bold">
              <span>Keyboard Shortcuts</span>
              <button onClick={() => setIsShortcutsOpen(false)} className="hover:text-[#EF4444] text-xs">×</button>
            </div>
            <div className="p-4 space-y-3 text-xs text-[#8B949E]">
              <div className="flex justify-between border-b border-[#30363D]/40 pb-2">
                <span>Command Palette</span>
                <kbd className="px-1.5 py-0.5 bg-[#0D1117] border border-[#30363D] rounded text-[10px] text-white">Ctrl+Shift+P</kbd>
              </div>
              <div className="flex justify-between border-b border-[#30363D]/40 pb-2">
                <span>Save Active File</span>
                <kbd className="px-1.5 py-0.5 bg-[#0D1117] border border-[#30363D] rounded text-[10px] text-white">Ctrl+S</kbd>
              </div>
              <div className="flex justify-between border-b border-[#30363D]/40 pb-2">
                <span>Toggle Copilot Chat</span>
                <kbd className="px-1.5 py-0.5 bg-[#0D1117] border border-[#30363D] rounded text-[10px] text-white">Ctrl+L</kbd>
              </div>
              <div className="flex justify-between border-b border-[#30363D]/40 pb-2">
                <span>Toggle Shortcuts Dialog</span>
                <kbd className="px-1.5 py-0.5 bg-[#0D1117] border border-[#30363D] rounded text-[10px] text-white">Ctrl+/</kbd>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsShortcutsOpen(false)}
                  className="px-4 py-1.5 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded font-medium cursor-pointer transition-colors text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {conflictState && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-mono select-none">
          <div className="bg-[#161B22] border border-[#EF4444] w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col animate-slide-down">
            <div className="h-10 border-b border-[#EF4444]/30 bg-red-950/20 px-4 flex items-center text-xs text-[#EF4444] font-bold">
              <span>File Overwrite Conflict</span>
            </div>
            <div className="p-4 space-y-4 text-xs text-[#8B949E]">
              <p className="text-white font-semibold">The file has been modified on disk by another process since you opened it.</p>
              <p className="text-[10px] bg-[#0D1117] p-2 border border-[#30363D] rounded text-left overflow-auto">
                File: {conflictState.path}
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={async () => {
                    const path = conflictState.path;
                    const content = dirtyFiles[path];
                    setConflictState(null);
                    try {
                      const response = await api.put(`/api/workspaces/${activeWorkspace?.workspaceId}/file`, {
                        content,
                        lastModified: 0
                      }, {
                        params: { path }
                      });
                      useWorkspaceStore.setState((state) => {
                        const newDirty = { ...state.dirtyFiles };
                        delete newDirty[path];
                        return {
                          fileContent: content,
                          fileContentsCache: { ...state.fileContentsCache, [path]: content },
                          lastModifiedCache: { ...state.lastModifiedCache, [path]: response.data.lastModified || 0 },
                          dirtyFiles: newDirty
                        };
                      });
                      addToast('File overwritten successfully.', 'success');
                      loadAnalysisData();
                    } catch {
                      addToast('Failed to overwrite file.', 'error');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded font-medium cursor-pointer transition-colors"
                >
                  Overwrite Disk
                </button>
                <button
                  onClick={async () => {
                    const path = conflictState.path;
                    setConflictState(null);
                    try {
                      await reloadFile(path);
                      addToast('File reloaded from disk. Local changes lost.', 'success');
                    } catch {
                      addToast('Failed to reload file.', 'error');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded border border-[#30363D] cursor-pointer transition-colors"
                >
                  Reload from Disk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="h-6 w-full bg-[#161B22] border-t border-[#30363D] px-4 flex items-center justify-between shrink-0 text-[#8B949E] text-[10px] font-mono select-none">
        <div className="flex items-center gap-4">
          <span className="text-[#22C55E] flex items-center gap-1 font-bold">
            <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> READY
          </span>
          <span>Workspace: {activeWorkspace?.projectName}</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsShortcutsOpen(true)}
            className="hover:text-white transition-colors cursor-pointer mr-2"
          >
            Shortcuts (Ctrl+/)
          </button>
          <button 
            onClick={() => setIsBottomCollapsed(!isBottomCollapsed)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            {isBottomCollapsed ? "Expand Terminal" : "Collapse Terminal"}
          </button>
          <span>Line {activeTab ? "Mono" : "0"}</span>
        </div>
      </div>
    </div>
  );
};
export default WorkspaceIde;
