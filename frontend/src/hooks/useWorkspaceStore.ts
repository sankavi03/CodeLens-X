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
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  projectTree: null,
  openTabs: [],
  activeTab: null,
  fileContent: null,
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
      set({ activeWorkspace: null, projectTree: null, openTabs: [], activeTab: null, fileContent: null });
      return;
    }

    set({ activeWorkspace: workspace, openTabs: [], activeTab: null, fileContent: null });
    if (workspace.status === 'READY') {
      await get().fetchProjectTree(workspace.workspaceId);
    }
  },

  fetchProjectTree: async (workspaceId) => {
    set({ isLoadingTree: true });
    try {
      const response = await api.get(`/api/workspaces/${workspaceId}/tree`);
      // The backend response is an ExplorerTreeResponseDto with a "root" field
      const tree = response.data.root || response.data;
      set({ projectTree: tree, isLoadingTree: false });
    } catch (error) {
      set({ isLoadingTree: false });
      throw error;
    }
  },

  openFile: async (path) => {
    const { openTabs, activeWorkspace } = get();
    if (!activeWorkspace) return;

    if (!openTabs.includes(path)) {
      set({ openTabs: [...openTabs, path] });
    }
    set({ activeTab: path, isLoadingContent: true });

    try {
      const response = await api.get(`/api/workspaces/${activeWorkspace.workspaceId}/file`, {
        params: { path }
      });
      // The backend returns a FileContentResponseDto with a "content" field
      set({ fileContent: response.data.content, isLoadingContent: false });
    } catch (error) {
      set({ fileContent: 'Error loading file content.', isLoadingContent: false });
      throw error;
    }
  },

  closeFile: (path) => {
    const { openTabs, activeTab } = get();
    const filteredTabs = openTabs.filter((t) => t !== path);
    set({ openTabs: filteredTabs });

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
    try {
      await api.delete(`/api/workspaces/${workspaceId}`);
      set((state) => ({
        workspaces: state.workspaces.filter((w) => w.workspaceId !== workspaceId),
        activeWorkspace: state.activeWorkspace?.workspaceId === workspaceId ? null : state.activeWorkspace,
      }));
    } catch (error) {
      throw error;
    }
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
}));
