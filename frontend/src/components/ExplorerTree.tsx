import React, { useState } from 'react';
import type { FileNode } from '../hooks/useWorkspaceStore';
import { useWorkspaceStore } from '../hooks/useWorkspaceStore';
import { ChevronRight, ChevronDown, Folder, FileCode, FileJson, FileText, Settings } from 'lucide-react';

interface ExplorerTreeProps {
  node: FileNode;
  onFileSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  activePath: string | null;
}

export const ExplorerTree: React.FC<ExplorerTreeProps> = ({ 
  node, onFileSelect, onContextMenu, activePath 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dirtyFiles = useWorkspaceStore((state) => state.dirtyFiles);
  const isDirty = dirtyFiles[node.relativePath] !== undefined;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleNodeClick = () => {
    if (node.type === 'FOLDER') {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.relativePath);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, node);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'java':
        return <FileCode className="h-3.5 w-3.5 text-orange-400 shrink-0" />;
      case 'py':
        return <FileCode className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
      case 'js':
      case 'jsx':
        return <FileCode className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
      case 'ts':
      case 'tsx':
        return <FileCode className="h-3.5 w-3.5 text-cyan-400 shrink-0" />;
      case 'json':
        return <FileJson className="h-3.5 w-3.5 text-teal-400 shrink-0" />;
      case 'xml':
        return <FileCode className="h-3.5 w-3.5 text-purple-400 shrink-0" />;
      case 'md':
        return <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
      case 'properties':
      case 'yml':
      case 'yaml':
        return <Settings className="h-3.5 w-3.5 text-brand-400 shrink-0" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-[#8B949E] shrink-0" />;
    }
  };

  const isActive = activePath === node.relativePath;

  if (node.type === 'FOLDER') {
    return (
      <div className="select-none font-mono text-[11px] w-full">
        <div 
          onClick={handleNodeClick}
          onContextMenu={handleContextMenu}
          className="flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-[#21262D] text-[#c9d1d9] cursor-pointer select-none transition-colors"
        >
          <span onClick={handleToggle} className="text-[#8B949E] hover:text-white shrink-0">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <Folder className="h-3.5 w-3.5 text-[#e1b07e] shrink-0 fill-[#e1b07e]/15" />
          <span className="truncate flex-1">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div className="pl-3.5 border-l border-[#30363D] ml-2.5 mt-0.5 space-y-0.5">
            {node.children.map((child, index) => (
              <ExplorerTree 
                key={index} 
                node={child} 
                onFileSelect={onFileSelect} 
                onContextMenu={onContextMenu}
                activePath={activePath} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={handleNodeClick}
      onContextMenu={handleContextMenu}
      className={`flex items-center gap-1.5 py-0.5 px-5 rounded font-mono text-[11px] cursor-pointer select-none transition-colors ${
        isActive 
          ? 'bg-[#21262D] text-white border-l-2 border-[#7C5CFC] pl-[18px] font-semibold' 
          : 'hover:bg-[#21262D] text-[#8B949E] hover:text-white'
      }`}
    >
      {getFileIcon(node.name)}
      <span className="truncate flex-1">{node.name}</span>
      {isDirty && (
        <span className="h-1.5 w-1.5 rounded-full bg-[#7C5CFC] shrink-0 mr-1 animate-pulse" title="Unsaved Changes" />
      )}
    </div>
  );
};
