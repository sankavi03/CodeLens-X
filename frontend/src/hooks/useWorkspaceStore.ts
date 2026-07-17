import { create } from 'zustand';
import api from '../services/api';

export interface Workspace {
  workspaceId: string;
  projectName: string;
  uploadedFileName: string;
  uploadTime: string;
  status: 'UPLOADED' | 'PARSING' | 'READY' | 'FAILED';
}

export interface FileNode {
  name: string;
  relativePath: string;
  type: 'FILE' | 'FOLDER';
  extension?: string;
  sizeBytes?: number;
  children?: FileNode[];
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  projectTree: FileNode | null;
  openTabs: string[];
  activeTab: string | null;
  fileContent: string | null;
  fileContentsCache: Record<string, string>;
  dirtyFiles: Record<string, string>; // path -> modified content
  lastModifiedCache: Record<string, number>; // path -> lastModified timestamp
  isLoadingWorkspaces: boolean;
  isLoadingTree: boolean;
  isLoadingContent: boolean;
  
  fetchWorkspaces: () => Promise<void>;
  selectWorkspace: (workspace: Workspace | null) => Promise<void>;
  fetchProjectTree: (workspaceId: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveTab: (path: string) => void;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  uploadWorkspace: (file: File) => Promise<Workspace>;
  setFileDirty: (path: string, content: string) => void;
  clearDirtyFile: (path: string) => void;
  saveFile: (path: string) => Promise<void>;
  discardChanges: (path: string) => void;
  reloadFile: (path: string) => Promise<void>;
  createFileOnDisk: (path: string) => Promise<void>;
  createFolderOnDisk: (path: string) => Promise<void>;
  renamePathOnDisk: (oldPath: string, newPath: string) => Promise<void>;
  deletePathOnDisk: (path: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  projectTree: null,
  openTabs: [],
  activeTab: null,
  fileContent: null,
  fileContentsCache: {},
  dirtyFiles: {},
  lastModifiedCache: {},
  isLoadingWorkspaces: false,
  isLoadingTree: false,
  isLoadingContent: false,

  fetchWorkspaces: async () => {
    set({ isLoadingWorkspaces: true });
    try {
      const response = await api.get('/api/workspaces');
      set({ workspaces: response.data, isLoadingWorkspaces: false });
    } catch (error) {
      set({ isLoadingWorkspaces: false });
      throw error;
    }
  },

  selectWorkspace: async (workspace) => {
    if (!workspace) {
      set({ activeWorkspace: null, projectTree: null, openTabs: [], activeTab: null, fileContent: null, fileContentsCache: {}, dirtyFiles: {}, lastModifiedCache: {} });
      return;
    }

    set({ activeWorkspace: workspace, openTabs: [], activeTab: null, fileContent: null, fileContentsCache: {}, dirtyFiles: {}, lastModifiedCache: {} });
    if (workspace.status === 'READY') {
      await get().fetchProjectTree(workspace.workspaceId);
    }
  },

  fetchProjectTree: async (workspaceId) => {
    set({ isLoadingTree: true });
    try {
      const response = await api.get(`/api/workspaces/${workspaceId}/tree`);
      const tree = response.data.root || response.data;
      set({ projectTree: tree, isLoadingTree: false });
    } catch (error) {
      set({ isLoadingTree: false });
      throw error;
    }
  },

  openFile: async (path) => {
    const { openTabs, activeWorkspace, fileContentsCache, dirtyFiles } = get();
    if (!activeWorkspace) return;

    if (!openTabs.includes(path)) {
      set({ openTabs: [...openTabs, path] });
    }
    set({ activeTab: path });

    // If there is active dirty content, load it instead of cache
    if (dirtyFiles[path] !== undefined) {
      set({ fileContent: dirtyFiles[path] });
      return;
    }

    if (fileContentsCache[path] !== undefined) {
      set({ fileContent: fileContentsCache[path] });
      return;
    }

    set({ isLoadingContent: true });

    try {
      const response = await api.get(`/api/workspaces/${activeWorkspace.workspaceId}/file`, {
        params: { path }
      });
      const content = response.data.content;
      const lastModified = response.data.lastModified || 0;
      set((state) => ({
        fileContent: content,
        fileContentsCache: { ...state.fileContentsCache, [path]: content },
        lastModifiedCache: { ...state.lastModifiedCache, [path]: lastModified },
        isLoadingContent: false
      }));
    } catch (error) {
      set({ fileContent: 'Error loading file content.', isLoadingContent: false });
      throw error;
    }
  },

  closeFile: (path) => {
    const { openTabs, activeTab } = get();
    const filteredTabs = openTabs.filter((t) => t !== path);
    set({ openTabs: filteredTabs });

    set((state) => {
      const newCache = { ...state.fileContentsCache };
      const newDirty = { ...state.dirtyFiles };
      const newLM = { ...state.lastModifiedCache };
      delete newCache[path];
      delete newDirty[path];
      delete newLM[path];
      return { fileContentsCache: newCache, dirtyFiles: newDirty, lastModifiedCache: newLM };
    });

    if (activeTab === path) {
      const nextActiveTab = filteredTabs.length > 0 ? filteredTabs[filteredTabs.length - 1] : null;
      set({ activeTab: nextActiveTab });
      if (nextActiveTab) {
        get().openFile(nextActiveTab);
      } else {
        set({ fileContent: null });
      }
    }
  },

  setActiveTab: (path) => {
    set({ activeTab: path });
    get().openFile(path);
  },

  deleteWorkspace: async (workspaceId) => {
    await api.delete(`/api/workspaces/${workspaceId}`);
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.workspaceId !== workspaceId),
      activeWorkspace: state.activeWorkspace?.workspaceId === workspaceId ? null : state.activeWorkspace,
    }));
  },

  uploadWorkspace: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/workspaces/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const newWorkspace = response.data;
    set((state) => ({
      workspaces: [newWorkspace, ...state.workspaces],
    }));
    return newWorkspace;
  },

  setFileDirty: (path, content) => {
    set((state) => ({
      dirtyFiles: { ...state.dirtyFiles, [path]: content }
    }));
  },

  clearDirtyFile: (path) => {
    set((state) => {
      const newDirty = { ...state.dirtyFiles };
      delete newDirty[path];
      return { dirtyFiles: newDirty };
    });
  },

  saveFile: async (path) => {
    const { activeWorkspace, dirtyFiles, lastModifiedCache } = get();
    if (!activeWorkspace || dirtyFiles[path] === undefined) return;

    const content = dirtyFiles[path];
    const lastModified = lastModifiedCache[path] || 0;

    const response = await api.put(`/api/workspaces/${activeWorkspace.workspaceId}/file`, {
      content,
      lastModified
    }, {
      params: { path }
    });

    // Update state with saved content and new timestamp
    set((state) => {
      const newDirty = { ...state.dirtyFiles };
      delete newDirty[path];
      return {
        fileContent: content,
        fileContentsCache: { ...state.fileContentsCache, [path]: content },
        lastModifiedCache: { ...state.lastModifiedCache, [path]: response.data.lastModified || 0 },
        dirtyFiles: newDirty
      };
    });

    // Refresh project tree
    await get().fetchProjectTree(activeWorkspace.workspaceId);
  },

  discardChanges: (path) => {
    const { fileContentsCache } = get();
    const originalContent = fileContentsCache[path] || '';
    set((state) => {
      const newDirty = { ...state.dirtyFiles };
      delete newDirty[path];
      return {
        fileContent: originalContent,
        dirtyFiles: newDirty
      };
    });
  },

  reloadFile: async (path) => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;

    set({ isLoadingContent: true });
    try {
      const response = await api.get(`/api/workspaces/${activeWorkspace.workspaceId}/file`, {
        params: { path }
      });
      const content = response.data.content;
      const lastModified = response.data.lastModified || 0;
      set((state) => {
        const newDirty = { ...state.dirtyFiles };
        delete newDirty[path];
        return {
          fileContent: content,
          fileContentsCache: { ...state.fileContentsCache, [path]: content },
          lastModifiedCache: { ...state.lastModifiedCache, [path]: lastModified },
          dirtyFiles: newDirty,
          isLoadingContent: false
        };
      });
    } catch (error) {
      set({ isLoadingContent: false });
      throw error;
    }
  },

  createFileOnDisk: async (path) => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;
    await api.post(`/api/workspaces/${activeWorkspace.workspaceId}/explorer/file`, null, {
      params: { path }
    });
    await get().fetchProjectTree(activeWorkspace.workspaceId);
  },

  createFolderOnDisk: async (path) => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;
    await api.post(`/api/workspaces/${activeWorkspace.workspaceId}/explorer/folder`, null, {
      params: { path }
    });
    await get().fetchProjectTree(activeWorkspace.workspaceId);
  },

  renamePathOnDisk: async (oldPath, newPath) => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;
    await api.put(`/api/workspaces/${activeWorkspace.workspaceId}/explorer/rename`, null, {
      params: { oldPath, newPath }
    });
    await get().fetchProjectTree(activeWorkspace.workspaceId);
  },

  deletePathOnDisk: async (path) => {
    const { activeWorkspace } = get();
    if (!activeWorkspace) return;
    await api.delete(`/api/workspaces/${activeWorkspace.workspaceId}/explorer`, {
      params: { path }
    });
    await get().fetchProjectTree(activeWorkspace.workspaceId);
  }
}));
