import { create } from 'zustand';

type UIState = {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  isAIAssistantOpen: boolean;
  setAIAssistantOpen: (open: boolean) => void;

  isShortcutHelpOpen: boolean;
  setShortcutHelpOpen: (open: boolean) => void;

  isCreateTaskOpen: boolean;
  setCreateTaskOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  isAIAssistantOpen: false,
  setAIAssistantOpen: (open) => set({ isAIAssistantOpen: open }),

  isShortcutHelpOpen: false,
  setShortcutHelpOpen: (open) => set({ isShortcutHelpOpen: open }),

  isCreateTaskOpen: false,
  setCreateTaskOpen: (open) => set({ isCreateTaskOpen: open }),
}));
