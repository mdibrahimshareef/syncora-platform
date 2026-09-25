import { create } from 'zustand';

export type ActiveTimer = {
  id?: string;
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  description?: string;
  startedAt: string;
  billable: boolean;
};

type TimeTrackingState = {
  activeTimer: ActiveTimer | null;
  startTimer: (timer: ActiveTimer) => void;
  stopTimer: () => void;
  updateTimer: (updates: Partial<ActiveTimer>) => void;
  clearTimer: () => void;
};

export const useTimeTrackingStore = create<TimeTrackingState>((set) => ({
  activeTimer: null,
  startTimer: (timer) => set({ activeTimer: timer }),
  stopTimer: () => set({ activeTimer: null }),
  updateTimer: (updates) => set((state) => ({
    activeTimer: state.activeTimer ? { ...state.activeTimer, ...updates } : null
  })),
  clearTimer: () => set({ activeTimer: null }),
}));
