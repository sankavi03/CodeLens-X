import React, { useEffect, useRef } from 'react';
import type { FileNode } from '../hooks/useWorkspaceStore';
import { Sparkles, BookOpen, GitFork, Link2, FilePlus, FolderPlus, Edit2, Trash2, Copy } from 'lucide-react';

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

  const isFolder = node.type === 'FOLDER';

  return (
    <div
      ref={menuRef}
      style={{ top: y, left: x }}
      className="fixed z-50 border border-[#30363D] bg-[#161B22] p-1.5 rounded-lg shadow-xl w-48 font-mono text-xs text-[#8B949E] select-none animate-fade-in"
    >
      <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#8B949E]/50 border-b border-[#30363D]/30 mb-1 truncate">
        {node.name}
      </div>

      <button
        onClick={() => handleAction('explain')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#21262D] hover:text-white text-left cursor-pointer transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#7C5CFC] shrink-0" />
        <span>Explain Code</span>
      </button>

      <button
        onClick={() => handleAction('docs')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#21262D] hover:text-white text-left cursor-pointer transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />
        <span>Generate Docs</span>
      </button>

      <button
        onClick={() => handleAction('dependencies')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#21262D] hover:text-white text-left cursor-pointer transition-colors"
      >
        <GitFork className="h-3.5 w-3.5 text-blue-400 shrink-0" />
        <span>View Dependencies</span>
      </button>

      <div className="border-t border-[#30363D]/50 my-1" />

      {isFolder && (
        <>
          <button
            onClick={() => handleAction('new-file')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#21262D] hover:text-white text-left cursor-pointer transition-colors"
          >
            <FilePlus className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />
            <span>New File</span>
          </button>
          <button
            onClick={() => handleAction('new-folder')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#21262D] hover:text-white text-left cursor-pointer transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
            <span>New Folder</span>
          </button>
        </>
      )}

      <button
        onClick={() => handleAction('rename')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#21262D] hover:text-white text-left cursor-pointer transition-colors"
      >
        <Edit2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
        <span>Rename</span>
      </button>

      <button
        onClick={() => handleAction('duplicate')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#21262D] hover:text-white text-left cursor-pointer transition-colors"
      >
        <Copy className="h-3.5 w-3.5 text-teal-400 shrink-0" />
        <span>Duplicate</span>
      </button>

      <button
        onClick={() => handleAction('delete')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-950/40 hover:text-[#EF4444] text-[#EF4444]/80 text-left cursor-pointer transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0" />
        <span>Delete</span>
      </button>

      <div className="border-t border-[#30363D]/50 my-1" />

      <button
        onClick={() => {
          navigator.clipboard.writeText(node.relativePath);
          handleAction('copy-path');
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#21262D] hover:text-white text-left cursor-pointer transition-colors"
      >
        <Link2 className="h-3.5 w-3.5 shrink-0" />
        <span>Copy Relative Path</span>
      </button>
    </div>
  );
};
