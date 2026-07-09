import React, { useEffect, useRef } from 'react';
import type { FileNode } from '../hooks/useWorkspaceStore';
import { Sparkles, BookOpen, GitFork, Link2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode;
  onClose: () => void;
  onAction: (actionName: string, node: FileNode) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ 
  x, y, node, onClose, onAction 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAction = (actionName: string) => {
    onAction(actionName, node);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ top: y, left: x }}
      className="fixed z-50 border border-panel-border bg-panel-sidebar p-1.5 rounded-lg shadow-xl w-48 font-mono text-xs text-panel-text select-none animate-fade-in"
    >
      <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-panel-text/50 border-b border-panel-border/30 mb-1 truncate">
        {node.name}
      </div>

      <button
        onClick={() => handleAction('explain')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel-hover hover:text-white text-left cursor-pointer transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 text-brand-400 shrink-0" />
        <span>Explain Code</span>
      </button>

      <button
        onClick={() => handleAction('docs')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel-hover hover:text-white text-left cursor-pointer transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span>Generate Docs</span>
      </button>

      <button
        onClick={() => handleAction('dependencies')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel-hover hover:text-white text-left cursor-pointer transition-colors"
      >
        <GitFork className="h-3.5 w-3.5 text-blue-400 shrink-0" />
        <span>View Dependencies</span>
      </button>

      <button
        onClick={() => {
          navigator.clipboard.writeText(node.relativePath);
          handleAction('copy-path');
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-panel-hover hover:text-white text-left cursor-pointer transition-colors border-t border-panel-border/20 mt-1"
      >
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        <span>Copy Relative Path</span>
      </button>
    </div>
  );
};
