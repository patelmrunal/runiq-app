export type RunnerDnaType =
  | 'early_bird'
  | 'night_owl'
  | 'speed_demon'
  | 'steady_pacer'
  | 'weekend_warrior'
  | 'streak_machine'
  | 'comeback_king';

export interface DnaMeta {
  type: RunnerDnaType;
  label: string;
  emoji: string;
  blurb: string;
}

const DNA_META: Record<RunnerDnaType, DnaMeta> = {
  early_bird: {
    type: 'early_bird',
    label: 'Early Bird',
    emoji: '🌅',
    blurb: 'Most of your runs start before 7:00 AM.',
  },
  night_owl: {
    type: 'night_owl',
    label: 'Night Owl',
    emoji: '🌙',
    blurb: 'You consistently show up after 7:00 PM.',
  },
  speed_demon: {
    type: 'speed_demon',
    label: 'Speed Demon',
    emoji: '⚡',
    blurb: 'You frequently choose hard tasks and push the pace.',
  },
  steady_pacer: {
    type: 'steady_pacer',
    label: 'Steady Pacer',
    emoji: '🐢',
    blurb: 'Your pace is controlled and consistent across runs.',
  },
  weekend_warrior: {
    type: 'weekend_warrior',
    label: 'Weekend Warrior',
    emoji: '🦁',
    blurb: 'Most of your effort lands on Saturdays and Sundays.',
  },
  streak_machine: {
    type: 'streak_machine',
    label: 'Streak Machine',
    emoji: '🔥',
    blurb: 'You protect your streak with relentless consistency.',
  },
  comeback_king: {
    type: 'comeback_king',
    label: 'Comeback King',
    emoji: '👑',
    blurb: 'You bounce back quickly after setbacks.',
  },
};

const VALID_DNA_TYPES = new Set<RunnerDnaType>(Object.keys(DNA_META) as RunnerDnaType[]);

export const normalizeDnaType = (value: unknown): RunnerDnaType | null => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!raw || raw === 'discovering' || raw === 'still_discovering') return null;
  return VALID_DNA_TYPES.has(raw as RunnerDnaType) ? (raw as RunnerDnaType) : null;
};

export const getDnaMeta = (value: unknown): DnaMeta | null => {
  const normalized = normalizeDnaType(value);
  return normalized ? DNA_META[normalized] : null;
};

export const formatDnaLabel = (value: unknown): string => {
  return getDnaMeta(value)?.label || 'Still Discovering';
};
