import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { collection, onSnapshot } from '@react-native-firebase/firestore';
import { db } from './firebase';

export interface RunTask {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  targetKm: number;
  targetMinutes: number;
  levelRequired: number;
  isActive: boolean;
}

const toDifficulty = (value: unknown): RunTask['difficulty'] => {
  const raw = typeof value === 'string' ? value.toLowerCase() : '';

  if (raw === 'hard') return 'Hard';
  if (raw === 'medium') return 'Medium';
  return 'Easy';
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const subscribeToRunTasks = (
  onUpdate: (tasks: RunTask[]) => void,
  onError?: (error: Error) => void
): (() => void) => {
  return onSnapshot(
    collection(db, 'auto'),
    (snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>) => {
      const tasks = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() || {};

          const task: RunTask = {
            id: docSnap.id,
            title: typeof data.title === 'string' ? data.title : docSnap.id,
            description: typeof data.description === 'string' ? data.description : '',
            difficulty: toDifficulty(data.difficulty),
            targetKm: toNumber(data.targetKm, 0),
            targetMinutes: toNumber(data.targetMinutes ?? data.targetMin, 0),
            levelRequired: toNumber(data.levelRequired, 1),
            isActive: data.isActive !== false,
          };

          return task;
        })
        .filter((task) => task.isActive)
        .sort((a, b) => a.levelRequired - b.levelRequired);

      onUpdate(tasks);
    },
    (error) => {
      console.error('[taskService] Failed to load tasks:', error);
      onError?.(error as Error);
    }
  );
};
