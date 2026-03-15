import { create } from 'zustand';

interface StreakState {
  currentStreak: number;
  ranTodayFlag: boolean;
  shieldActivated: boolean;
  lastRunDate: string;
}

interface StreakActions {
  setStreakData: (data: Partial<StreakState>) => void;
  markRanToday: () => void;
}

const initialState: StreakState = {
  currentStreak: 0,
  ranTodayFlag: false,
  shieldActivated: false,
  lastRunDate: '',
};

export const useStreakStore = create<StreakState & StreakActions>((set) => ({
  ...initialState,
  setStreakData: (data) => set((state) => ({ ...state, ...data })),
  markRanToday: () => set({ ranTodayFlag: true }),
}));
