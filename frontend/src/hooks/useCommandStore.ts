import { create } from 'zustand';

interface CommandState {
  isPaletteOpen: boolean;
  isFileSearchOpen: boolean;
  searchQuery: string;
  setPaletteOpen: (open: boolean) => void;
  setFileSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  isPaletteOpen: false,
  isFileSearchOpen: false,
  searchQuery: '',
  setPaletteOpen: (open) => set({ isPaletteOpen: open }),
  setFileSearchOpen: (open) => set({ isFileSearchOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
