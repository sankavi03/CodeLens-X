import React, { useState, useEffect, useRef } from 'react';
import { useCommandStore } from '../hooks/useCommandStore';
import { useWorkspaceStore, type FileNode } from '../hooks/useWorkspaceStore';
import { Terminal, File, Search, HelpCircle } from 'lucide-react';

interface CommandItem {
  name: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const { 
    isPaletteOpen, isFileSearchOpen, setPaletteOpen, setFileSearchOpen 
  } = useCommandStore();

  const { projectTree, openFile } = useWorkspaceStore();

  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Collect all files in the tree
  const getAllFiles = (node: FileNode | null): string[] => {
    if (!node) return [];
    const files: string[] = [];
    
    const traverse = (n: FileNode) => {
      if (n.type === 'FILE') {
        files.push(n.relativePath);
      } else if (n.children) {
        n.children.forEach(traverse);
      }
    };
    
    traverse(node);
    return files;
  };

  const files = getAllFiles(projectTree);

  // Command Palette Items
  const commands: CommandItem[] = [
    {
      name: 'Explain active file',
      category: 'AI Assistant',
      shortcut: 'Ctrl+Shift+E',
      action: () => {
        // Trigger file explanation click
        const btn = document.getElementById('explain-btn-trigger');
        if (btn) btn.click();
      }
    },
    {
      name: 'Generate project documentation',
      category: 'Generator',
      shortcut: 'Ctrl+Shift+D',
      action: () => {
        const btn = document.getElementById('docs-btn-trigger');
        if (btn) btn.click();
      }
    },
    {
      name: 'Generate README.md',
      category: 'Generator',
      shortcut: 'Ctrl+Shift+R',
      action: () => {
        const btn = document.getElementById('readme-btn-trigger');
        if (btn) btn.click();
      }
    },
    {
      name: 'Analyze design patterns',
      category: 'Analysis',
      action: () => {
        const tab = document.getElementById('tab-patterns-trigger');
        if (tab) tab.click();
      }
    },
    {
      name: 'Analyze dependency couplings',
      category: 'Analysis',
      action: () => {
        const tab = document.getElementById('tab-graph-trigger');
        if (tab) tab.click();
      }
    },
    {
      name: 'View project statistics',
      category: 'Metrics',
      action: () => {
        const tab = document.getElementById('tab-stats-trigger');
        if (tab) tab.click();
      }
    },
    {
      name: 'Open code quality insights',
      category: 'Metrics',
      action: () => {
        const tab = document.getElementById('tab-insights-trigger');
        if (tab) tab.click();
      }
    }
  ];

  // Global keydown listeners for shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setPaletteOpen(!isPaletteOpen);
        setFileSearchOpen(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setFileSearchOpen(!isFileSearchOpen);
        setPaletteOpen(false);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setFileSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen, isFileSearchOpen, setPaletteOpen, setFileSearchOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isPaletteOpen || isFileSearchOpen) {
      setInput('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isPaletteOpen, isFileSearchOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
        setFileSearchOpen(false);
      }
    };

    if (isPaletteOpen || isFileSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPaletteOpen, isFileSearchOpen, setPaletteOpen, setFileSearchOpen]);

  if (!isPaletteOpen && !isFileSearchOpen) return null;

  // Filter items
  const filteredFiles = files.filter(f => f.toLowerCase().includes(input.toLowerCase())).slice(0, 8);
  const filteredCommands = commands.filter(c => c.name.toLowerCase().includes(input.toLowerCase()));

  const itemsCount = isFileSearchOpen ? filteredFiles.length : filteredCommands.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % itemsCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + itemsCount) % itemsCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (itemsCount > 0) {
        if (isFileSearchOpen) {
          openFile(filteredFiles[selectedIndex]);
          setFileSearchOpen(false);
        } else {
          filteredCommands[selectedIndex].action();
          setPaletteOpen(false);
        }
      }
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/60 pt-[80px] px-4 animate-fade-in font-mono">
      <div 
        ref={modalRef}
        className="w-full max-w-[600px] border border-panel-border bg-panel-sidebar rounded-lg shadow-2xl overflow-hidden animate-slide-down"
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 border-b border-panel-border px-4 py-3 bg-panel-bg">
          {isFileSearchOpen ? (
            <Search className="h-4.5 w-4.5 text-brand-400 shrink-0" />
          ) : (
            <Terminal className="h-4.5 w-4.5 text-brand-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isFileSearchOpen ? "Search files in project tree..." : "Type a command to run..."}
            className="w-full bg-transparent focus:outline-none text-xs text-white placeholder-panel-text/40"
          />
        </div>

        {/* Search Results list */}
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-0.5">
          {itemsCount === 0 && (
            <div className="py-8 text-center text-xs text-panel-text flex flex-col items-center gap-1.5">
              <HelpCircle className="h-5 w-5 text-panel-text/40" />
              <span>No matching results found.</span>
            </div>
          )}

          {isFileSearchOpen ? (
            filteredFiles.map((file, idx) => (
              <div
                key={file}
                onClick={() => {
                  openFile(file);
                  setFileSearchOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded text-xs cursor-pointer ${
                  selectedIndex === idx ? 'bg-panel-active text-white' : 'text-panel-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <File className="h-3.5 w-3.5" />
                  <span className="truncate">{file.split('/').pop()}</span>
                  <span className="text-[10px] opacity-50 truncate">({file})</span>
                </div>
              </div>
            ))
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.name}
                onClick={() => {
                  cmd.action();
                  setPaletteOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded text-xs cursor-pointer ${
                  selectedIndex === idx ? 'bg-panel-active text-white' : 'text-panel-text'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>{cmd.name}</span>
                  <span className="text-[10px] opacity-40 font-mono bg-panel-bg px-1.5 py-0.5 rounded">
                    {cmd.category}
                  </span>
                </div>
                {cmd.shortcut && (
                  <span className="text-[10px] opacity-50 font-mono">{cmd.shortcut}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
