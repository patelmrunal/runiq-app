import { create } from 'zustand';

interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

interface CurrentRun {
  startTime: number | null;
  distance: number;
  duration: number;
  pace: number;
  coordinates: Coordinate[];
  taskId: string | null;
  pausedDuration: number;
}

interface RunState {
  isRunning: boolean;
  isPaused: boolean;
  currentRun: CurrentRun;
  offlineQueue: unknown[];
}

interface RunActions {
  startRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  endRun: () => void;
  addCoordinate: (coordinate: Coordinate) => void;
  updateDistance: (distance: number) => void;
  updatePace: (pace: number) => void;
  clearRun: () => void;
}

const initialRun: CurrentRun = {
  startTime: null,
  distance: 0,
  duration: 0,
  pace: 0,
  coordinates: [],
  taskId: null,
  pausedDuration: 0,
};

const initialState: RunState = {
  isRunning: false,
  isPaused: false,
  currentRun: initialRun,
  offlineQueue: [],
};

export const useRunStore = create<RunState & RunActions>((set) => ({
  ...initialState,
  startRun: () =>
    set({
      isRunning: true,
      isPaused: false,
      currentRun: { ...initialRun, startTime: Date.now() },
    }),
  pauseRun: () => set({ isPaused: true }),
  resumeRun: () => set({ isPaused: false }),
  endRun: () => set({ isRunning: false, isPaused: false }),
  addCoordinate: (coordinate) =>
    set((state) => ({
      currentRun: {
        ...state.currentRun,
        coordinates: [...state.currentRun.coordinates, coordinate],
      },
    })),
  updateDistance: (distance) =>
    set((state) => ({ currentRun: { ...state.currentRun, distance } })),
  updatePace: (pace) =>
    set((state) => ({ currentRun: { ...state.currentRun, pace } })),
  clearRun: () => set(initialState),
}));
