const EASY_NAMES = [
  'Starter Shuffle',
  'Fresh Air Jog',
  'Sunrise Reset',
  'Rhythm Builder',
  'Smooth Stride',
  'Steady Spark',
  'Calm Cardio',
  'Momentum Walk-Run',
  'Consistency Loop',
  'Focus Flow',
  'Mile Maker',
  'Confidence Cruise',
  'Endurance Primer',
  'Morning Meter',
  'Habit Builder',
  'Progress Pulse',
  'Recovery Runner',
  'Streak Saver',
  'Form First',
  'Balanced Base',
];

const MEDIUM_NAMES = [
  'Tempo Builder',
  'Power Pace',
  'Engine Ignite',
  'Midday Push',
  'Cadence Craft',
  'Threshold Tuner',
  'Distance Driver',
  'Control and Carry',
  'Steady Climb',
  'Pace Discipline',
  'Core Endurance',
  'Speed Economy',
  'Flow State Run',
  'Resilience Route',
  'Grit Interval Lite',
  'Cruise Control',
  'Breath and Burn',
  'Rhythm Lock',
  'Strong Finish',
  'Stamina Stack',
];

const HARD_NAMES = [
  'Beast Builder',
  'Long Grind',
  'Heat Check',
  'Iron Rhythm',
  'Distance Dominator',
  'Pace Breaker',
  'Summit Run',
  'Warrior Window',
  'Ultra Prep',
  'Marathon Mindset',
  'No Excuse Run',
  'Strong Legs Circuit',
  'Peak Endurance',
  'Night Hero',
  'Lionheart Loop',
  'Threshold Assault',
  'Legend Maker',
  'Streak Defender Pro',
  'Velocity Vault',
  'Final Boss Run',
];

const EASY_KM = [1.5, 1.8, 2.0, 2.2, 2.5, 2.8, 3.0, 3.2, 2.6, 3.0, 3.4, 3.8, 4.0, 4.2, 3.6, 4.4, 4.8, 5.0, 5.2, 5.5];
const MEDIUM_KM = [3.5, 3.8, 4.0, 4.3, 4.6, 5.0, 5.3, 5.6, 5.0, 5.4, 5.8, 6.1, 6.4, 6.8, 6.0, 7.0, 7.4, 7.8, 8.2, 8.6];
const HARD_KM = [6.0, 6.5, 7.0, 7.5, 8.0, 8.8, 9.5, 10.2, 9.0, 9.8, 10.5, 11.2, 12.0, 12.8, 11.0, 13.5, 14.2, 15.0, 16.0, 18.0];

const getLevelForIndex = (index) => {
  if (index < 8) return 1;
  if (index < 14) return 2;
  return 3;
};

const toMinutes = (km, paceMinPerKm) => {
  const value = Math.round(km * paceMinPerKm);
  return Math.max(12, value);
};

const toKmValue = (value) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? Number(rounded.toFixed(0)) : Number(rounded.toFixed(1));
};

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);

const buildDifficultyTemplates = ({
  difficulty,
  names,
  distances,
  paceMinPerKm,
  descriptionPrefix,
}) => {
  return names.map((name, index) => {
    const targetKm = toKmValue(distances[index]);
    const levelRequired = getLevelForIndex(index);
    const id = `${difficulty}_${String(index + 1).padStart(2, '0')}_${slugify(name)}`;

    return {
      id,
      title: name,
      description: `${descriptionPrefix} Complete ${targetKm} km with controlled effort.`,
      difficulty,
      targetKm,
      targetMinutes: toMinutes(targetKm, paceMinPerKm),
      levelRequired,
      isActive: true,
    };
  });
};

const buildPhase3Templates = () => {
  const easy = buildDifficultyTemplates({
    difficulty: 'easy',
    names: EASY_NAMES,
    distances: EASY_KM,
    paceMinPerKm: 9.3,
    descriptionPrefix: 'An easy effort to build consistency.',
  });

  const medium = buildDifficultyTemplates({
    difficulty: 'medium',
    names: MEDIUM_NAMES,
    distances: MEDIUM_KM,
    paceMinPerKm: 8.1,
    descriptionPrefix: 'A moderate challenge to build endurance and pace control.',
  });

  const hard = buildDifficultyTemplates({
    difficulty: 'hard',
    names: HARD_NAMES,
    distances: HARD_KM,
    paceMinPerKm: 7.1,
    descriptionPrefix: 'A high-effort challenge for advanced progression days.',
  });

  const templates = [...easy, ...medium, ...hard];

  if (templates.length !== 60) {
    throw new Error(`Expected 60 templates, got ${templates.length}`);
  }

  return templates;
};

const summarizeTemplates = (templates) => {
  const byDifficulty = templates.reduce((acc, task) => {
    acc[task.difficulty] = (acc[task.difficulty] || 0) + 1;
    return acc;
  }, {});

  const byLevel = templates.reduce((acc, task) => {
    const key = `level_${task.levelRequired}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    total: templates.length,
    byDifficulty,
    byLevel,
  };
};

const templates = buildPhase3Templates();

module.exports = {
  templates,
  summarizeTemplates,
  buildPhase3Templates,
};
