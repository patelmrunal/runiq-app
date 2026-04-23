import { create } from 'zustand';
import type { RunnerDnaType } from '../utils/dna';

type DnaType = RunnerDnaType | null;

interface UserState {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string | null;
  tier: 'basic' | 'premium';
  level: number;
  currentStreak: number;
  longestStreak: number;
  shieldsAvailable: number;
  dnaType: DnaType;
  totalKm: number;
  totalRuns: number;
  homeCity: string;
  homeTimezone: string;
  restDay: number;
}

interface UserActions {
  setUser: (user: Partial<UserState>) => void;
  clearUser: () => void;
  updateTier: (tier: 'basic' | 'premium') => void;
}

const initialState: UserState = {
  uid: '',
  email: '',
  username: '',
  displayName: '',
  photoURL: null,
  tier: 'basic',
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  shieldsAvailable: 0,
  dnaType: null,
  totalKm: 0,
  totalRuns: 0,
  homeCity: '',
  homeTimezone: '',
  restDay: 0,
};

export const useUserStore = create<UserState & UserActions>((set) => ({
  ...initialState,
  setUser: (user) => set((state) => ({ ...state, ...user })),
  clearUser: () => set(initialState),
  updateTier: (tier) => set({ tier }),
}));
