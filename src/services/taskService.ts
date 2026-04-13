import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { collection, onSnapshot } from '@react-native-firebase/firestore';
import { auth, db } from './firebase';

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

export interface SubscribeRunTasksOptions {
  homeTimezone?: string;
  allowTemplateFallbackForUser?: boolean;
  maxDailyTasks?: number;
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

const getTodayDayKeyLocal = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getTodayDayKey = (homeTimezone?: string): string => {
  if (!homeTimezone) {
    return getTodayDayKeyLocal();
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: homeTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const lookup: Record<string, string> = {};
  parts.forEach((part) => {
    lookup[part.type] = part.value;
  });

  if (!lookup.year || !lookup.month || !lookup.day) {
    return getTodayDayKeyLocal();
  }

  return `${lookup.year}-${lookup.month}-${lookup.day}`;
};

const mapDocToTask = (
  docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>
): RunTask => {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    title: typeof data.title === 'string' ? data.title : docSnap.id,
    description: typeof data.description === 'string' ? data.description : '',
    difficulty: toDifficulty(data.difficulty),
    targetKm: toNumber(data.targetKm, 0),
    targetMinutes: toNumber(data.targetMinutes ?? data.targetMin, 0),
    levelRequired: toNumber(data.levelRequired, 1),
    isActive: data.isActive !== false,
  };
};

export const subscribeToRunTasks = (
  onUpdate: (tasks: RunTask[]) => void,
  onError?: (error: Error) => void,
  options?: SubscribeRunTasksOptions
): (() => void) => {
  let templateTasks: RunTask[] = [];
  let hasDailyTasks = false;
  const allowTemplateFallbackForUser = options?.allowTemplateFallbackForUser === true;

  const uid = auth.currentUser?.uid;
  if (!uid) {
    const unsubscribeTemplates = onSnapshot(
      collection(db, 'auto'),
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>) => {
        templateTasks = snapshot.docs
          .map((docSnap) => mapDocToTask(docSnap))
          .filter((task) => task.isActive)
          .sort((a, b) => a.levelRequired - b.levelRequired);

        onUpdate(templateTasks);
      },
      (error) => {
        console.error('[taskService] Failed to load tasks:', error);
        onError?.(error as Error);
      }
    );

    return unsubscribeTemplates;
  }

  let unsubscribeTemplates: (() => void) | null = null;

  if (allowTemplateFallbackForUser) {
    unsubscribeTemplates = onSnapshot(
      collection(db, 'auto'),
      (snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>) => {
        templateTasks = snapshot.docs
          .map((docSnap) => mapDocToTask(docSnap))
          .filter((task) => task.isActive)
          .sort((a, b) => a.levelRequired - b.levelRequired);

        if (!hasDailyTasks) {
          onUpdate(templateTasks);
        }
      },
      (error) => {
        console.error('[taskService] Failed to load fallback templates:', error);
        onError?.(error as Error);
      }
    );
  }

  const unsubscribeDailyTasks = onSnapshot(
    collection(db, 'users', uid, 'dailyTasks'),
    (snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>) => {
      const todayKey = getTodayDayKey(options?.homeTimezone);
      const maxDailyTasks = Number.isFinite(options?.maxDailyTasks)
        ? Math.max(1, Math.floor(Number(options?.maxDailyTasks)))
        : 4;

      const normalizedEntries = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            task: mapDocToTask(docSnap),
            dayKey: typeof data.dayKey === 'string' ? data.dayKey : '',
            position: toNumber(data.position, 999),
          };
        })
        .filter((entry) => entry.task.isActive);

      const todayEntries = normalizedEntries.filter((entry) => entry.dayKey === todayKey);
      const legacyEntries = normalizedEntries.filter((entry) => !entry.dayKey);
      const sourceEntries = todayEntries.length > 0 ? todayEntries : legacyEntries;

      const dailyTasks = sourceEntries
        .sort((a, b) => a.position - b.position)
        .slice(0, maxDailyTasks)
        .map((entry) => entry.task);

      if (todayEntries.length === 0 && legacyEntries.length > 0) {
        console.warn('[taskService] Using legacy dailyTasks docs without dayKey. Consider refreshing assignments.');
      }

      hasDailyTasks = dailyTasks.length > 0;
      if (hasDailyTasks || !allowTemplateFallbackForUser) {
        onUpdate(dailyTasks);
        return;
      }

      onUpdate(templateTasks);
    },
    (error) => {
      console.error('[taskService] Failed to load daily tasks:', error);
      onError?.(error as Error);
    }
  );

  return () => {
    unsubscribeDailyTasks();
    if (unsubscribeTemplates) {
      unsubscribeTemplates();
    }
  };
};
