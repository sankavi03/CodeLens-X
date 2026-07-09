import React, { useState } from 'react';
import type { FileNode } from '../hooks/useWorkspaceStore';
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
        return <FileCode className="h-4 w-4 text-orange-400 shrink-0" />;
      case 'py':
        return <FileCode className="h-4 w-4 text-blue-400 shrink-0" />;
      case 'js':
      case 'jsx':
        return <FileCode className="h-4 w-4 text-yellow-400 shrink-0" />;
      case 'ts':
      case 'tsx':
        return <FileCode className="h-4 w-4 text-cyan-400 shrink-0" />;
      case 'json':
        return <FileJson className="h-4 w-4 text-teal-400 shrink-0" />;
      case 'xml':
        return <FileCode className="h-4 w-4 text-purple-400 shrink-0" />;
      case 'md':
        return <FileText className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'properties':
      case 'yml':
      case 'yaml':
        return <Settings className="h-4 w-4 text-[#8b5cf6] shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-panel-text shrink-0" />;
    }
  };

  const isActive = activePath === node.relativePath;

  if (node.type === 'FOLDER') {
    return (
      <div className="select-none font-mono text-xs">
        <div 
          onClick={handleNodeClick}
          onContextMenu={handleContextMenu}
          className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-panel-hover text-white cursor-pointer select-none"
        >
          <span onClick={handleToggle} className="text-panel-text shrink-0">
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <Folder className="h-4 w-4 text-[#a78bfa] shrink-0 fill-[#a78bfa]/15" />
          <span className="truncate">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div className="pl-4 border-l border-panel-border/30 ml-2.5 mt-0.5 space-y-0.5">
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
      className={`flex items-center gap-1.5 py-1 px-5 rounded font-mono text-xs cursor-pointer select-none ${
        isActive 
          ? 'bg-panel-active text-white border-l-2 border-brand-500 pl-[18px]' 
          : 'hover:bg-panel-hover text-panel-text hover:text-white'
      }`}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </div>
  );
};
