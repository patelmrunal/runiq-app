#!/usr/bin/env node

const admin = require('firebase-admin');

const DEFAULT_BADGES = [
  {
    id: 'first_run',
    name: 'First Run',
    description: 'Complete your first run.',
    category: 'distance',
    isPremiumOnly: false,
    milestone: true,
    isActive: true,
    condition: { type: 'run_count', threshold: 1 },
  },
  {
    id: 'total_km_10',
    name: '10K Lifetime',
    description: 'Reach 10 km total running distance.',
    category: 'distance',
    isPremiumOnly: false,
    milestone: false,
    isActive: true,
    condition: { type: 'total_km', threshold: 10 },
  },
  {
    id: 'total_km_50',
    name: '50K Lifetime',
    description: 'Reach 50 km total running distance.',
    category: 'distance',
    isPremiumOnly: false,
    milestone: false,
    isActive: true,
    condition: { type: 'total_km', threshold: 50 },
  },
  {
    id: 'total_km_100',
    name: '100K Lifetime',
    description: 'Reach 100 km total running distance.',
    category: 'distance',
    isPremiumOnly: false,
    milestone: true,
    isActive: true,
    condition: { type: 'total_km', threshold: 100 },
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Keep your streak alive for 3 days.',
    category: 'streak',
    isPremiumOnly: false,
    milestone: false,
    isActive: true,
    condition: { type: 'current_streak', threshold: 3 },
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Keep your streak alive for 7 days.',
    category: 'streak',
    isPremiumOnly: false,
    milestone: true,
    isActive: true,
    condition: { type: 'current_streak', threshold: 7 },
  },
  {
    id: 'streak_30',
    name: '30-Day Streak',
    description: 'Keep your streak alive for 30 days.',
    category: 'streak',
    isPremiumOnly: false,
    milestone: true,
    isActive: true,
    condition: { type: 'current_streak', threshold: 30 },
  },
  {
    id: 'hard_task_10',
    name: 'Hard Charger',
    description: 'Complete 10 hard tasks.',
    category: 'behaviour',
    isPremiumOnly: false,
    milestone: false,
    isActive: true,
    condition: { type: 'hard_task_completions', threshold: 10 },
  },
  {
    id: 'early_runner',
    name: 'Early Starter',
    description: 'Start a run before 7:00 AM.',
    category: 'time_of_day',
    isPremiumOnly: false,
    milestone: false,
    isActive: true,
    condition: { type: 'run_time_window', beforeHour: 7 },
  },
  {
    id: 'night_runner',
    name: 'Night Strider',
    description: 'Start a run after 7:00 PM.',
    category: 'time_of_day',
    isPremiumOnly: false,
    milestone: false,
    isActive: true,
    condition: { type: 'run_time_window', afterHour: 19 },
  },
  {
    id: 'rain_runner',
    name: 'Rain Runner',
    description: 'Complete a run while it is raining.',
    category: 'weather',
    isPremiumOnly: false,
    milestone: false,
    isActive: true,
    condition: { type: 'raining_run' },
  },
];

const args = process.argv.slice(2);
const projectArg = args.find((arg) => arg.startsWith('--project='));
const projectId = projectArg ? projectArg.split('=')[1] : 'runiq-dev';
const apply = args.includes('--apply');

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

const main = async () => {
  const payload = {
    version: 'phase4-v1',
    badges: DEFAULT_BADGES,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!apply) {
    console.log('[phase4-badges] Dry run');
    console.log(`project=${projectId}`);
    console.log(`badgeCount=${DEFAULT_BADGES.length}`);
    console.log(`milestoneCount=${DEFAULT_BADGES.filter((badge) => badge.milestone).length}`);
    console.log('Use --apply to write config/badgeDefinitions');
    return;
  }

  await db.collection('config').doc('badgeDefinitions').set(payload, { merge: true });

  console.log('[phase4-badges] Apply complete');
  console.log(`project=${projectId}`);
  console.log(`badgeCount=${DEFAULT_BADGES.length}`);
};

main().catch((error) => {
  console.error('[phase4-badges] Failed:', error);
  process.exitCode = 1;
});
