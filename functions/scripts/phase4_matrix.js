/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const PROJECT_ID = 'runiq-dev';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForCondition = async (conditionFn, timeoutMs = 45000, intervalMs = 1000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    // conditionFn can return a truthy value we want to preserve.
    // eslint-disable-next-line no-await-in-loop
    const result = await conditionFn();
    if (result) return result;
    // eslint-disable-next-line no-await-in-loop
    await sleep(intervalMs);
  }
  return null;
};

const results = [];
const record = (id, status, notes) => {
  const row = { id, status, notes };
  results.push(row);
  console.log(`${id} -> ${status}: ${notes}`);
};

const makeUserId = (suffix) => `phase4_matrix_${suffix}_${Date.now()}`;

const baseUserDoc = (uid, overrides = {}) => ({
  uid,
  email: `${uid}@example.com`,
  username: uid,
  displayName: uid,
  photoURL: null,
  createdAt: Timestamp.now(),
  lastActiveAt: Timestamp.now(),
  tier: 'basic',
  premiumExpiresAt: null,
  isActive: true,
  homeCity: 'Surat',
  homeState: 'Gujarat',
  homeTimezone: 'Asia/Kolkata',
  homeCoords: { lat: 21.1702, lng: 72.8311 },
  dnaType: null,
  dnaHistory: [],
  runCount: 0,
  totalKm: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastRunDate: null,
  ranTodayFlag: false,
  shieldsAvailable: 1,
  shieldUsedThisMonth: false,
  restDay: 0,
  streakBreaksLast30: 0,
  level: 1,
  daysAsLegend: 0,
  onboarding: {
    runFrequency: null,
    preferredTime: null,
    primaryGoal: null,
  },
  buddyUid: null,
  buddyRequestSentTo: null,
  buddyRequestReceivedFrom: null,
  ...overrides,
});

const setUser = async (uid, overrides = {}) => {
  await db.collection('users').doc(uid).set(baseUserDoc(uid, overrides), { merge: true });
};

const makeRunPayload = ({ uid, runId, startDate, endDate, taskDifficulty = 'hard', distance = 1.5, duration = 720, weatherRaining = false, status = 'pending', taskId = 'task_phase4' }) => ({
  runId,
  userId: uid,
  createdAt: Timestamp.fromDate(endDate),
  taskId,
  taskTitle: 'Phase4 Task',
  taskDifficulty,
  taskTargetKm: 1.5,
  taskTargetMinutes: 15,
  startTime: Timestamp.fromDate(startDate),
  endTime: Timestamp.fromDate(endDate),
  duration,
  distance,
  avgPace: Number(((duration / 60) / distance).toFixed(2)),
  calories: Math.round(distance * 70),
  isManual: false,
  routePolyline: JSON.stringify([
    { latitude: 21.17, longitude: 72.83 },
    { latitude: 21.171, longitude: 72.831 },
    { latitude: 21.172, longitude: 72.832 },
  ]),
  routePointCount: 30,
  startCoordHash: 'te7v8',
  city: 'Surat',
  weather: {
    condition: weatherRaining ? 'rain' : 'clear',
    tempC: 30,
    wasRaining: weatherRaining,
  },
  phoneDND: false,
  status,
  processedAt: null,
  flagReason: null,
});

const writePendingRun = async ({ uid, runId, date, taskDifficulty = 'hard', distance = 1.5, duration = 720, weatherRaining = false, taskId = 'task_phase4' }) => {
  const endDate = new Date(date.getTime());
  const startDate = new Date(endDate.getTime() - duration * 1000);
  const payload = makeRunPayload({
    uid,
    runId,
    startDate,
    endDate,
    taskDifficulty,
    distance,
    duration,
    weatherRaining,
    status: 'pending',
    taskId,
  });

  await db.collection('users').doc(uid).collection('runLog').doc(runId).set(payload);
};

const seedValidRun = async ({ uid, runId, date, taskDifficulty = 'easy', distance = 1.5, duration = 900, weatherRaining = false }) => {
  const endDate = new Date(date.getTime());
  const startDate = new Date(endDate.getTime() - duration * 1000);
  const payload = makeRunPayload({
    uid,
    runId,
    startDate,
    endDate,
    taskDifficulty,
    distance,
    duration,
    weatherRaining,
    status: 'valid',
  });

  payload.processedAt = Timestamp.fromDate(endDate);
  payload.taskCompleted = true;
  payload.taskResult = 'completed';

  await db.collection('users').doc(uid).collection('runLog').doc(runId).set(payload);
};

const waitForRunProcessed = async (uid, runId, timeoutMs = 90000) => {
  const started = Date.now();
  const runRef = db.collection('users').doc(uid).collection('runLog').doc(runId);

  while (Date.now() - started < timeoutMs) {
    const snap = await runRef.get();
    if (snap.exists) {
      const data = snap.data() || {};
      if ((data.status === 'valid' || data.status === 'flagged') && data.processedAt) {
        return data;
      }
    }
    await sleep(1000);
  }

  throw new Error(`Timeout waiting for run processing: ${uid}/${runId}`);
};

const waitForDnaType = async (uid, expectedDnaType = null, timeoutMs = 45000) => {
  const userRef = db.collection('users').doc(uid);
  return waitForCondition(async () => {
    const snap = await userRef.get();
    const data = snap.data() || {};
    const dnaType = data.dnaType || null;
    if (!expectedDnaType) {
      return dnaType ? data : null;
    }
    return dnaType === expectedDnaType ? data : null;
  }, timeoutMs, 1000);
};

const waitForDnaEvent = async (uid, timeoutMs = 45000) => {
  return waitForCondition(async () => {
    const events = await getEvents(uid, 'dna_evolved');
    return events.length > 0 ? events : null;
  }, timeoutMs, 1000);
};

const getEvents = async (uid, type = null) => {
  const snap = await db.collection('users').doc(uid).collection('events').get();
  const all = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
  return type ? all.filter((item) => item.type === type) : all;
};

const getBadges = async (uid) => {
  const snap = await db.collection('users').doc(uid).collection('badges').get();
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }));
};

const deleteCollectionDocs = async (colRef) => {
  while (true) {
    const snap = await colRef.limit(200).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
};

const cleanupUser = async (uid) => {
  const userRef = db.collection('users').doc(uid);
  const sub = ['runLog', 'dailyTasks', 'events', 'devices', 'badges', 'streakHistory'];
  for (const name of sub) {
    await deleteCollectionDocs(userRef.collection(name));
  }
  await userRef.delete().catch(() => {});
};

const checkStaticFileContains = (filePath, mustContain) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return mustContain.every((item) => content.includes(item));
};

const runMainTests = async () => {
  const uidMain = makeUserId('main');
  const uidWindow = makeUserId('window');
  const uidComeback = makeUserId('comeback');
  const uidRetain = makeUserId('retain');

  const createdUsers = [uidMain, uidWindow, uidComeback, uidRetain];

  try {
    const badgeConfig = await db.collection('config').doc('badgeDefinitions').get();
    const badgeCount = Array.isArray(badgeConfig.data()?.badges) ? badgeConfig.data().badges.length : 0;
    record('T401', badgeConfig.exists && badgeCount > 0 ? 'PASS' : 'FAIL', `badgeDefinitions exists=${badgeConfig.exists}, badgeCount=${badgeCount}`);

    await setUser(uidMain, { streakBreaksLast30: 2, homeTimezone: 'Asia/Kolkata' });

    const baseDate = new Date();

    for (let i = 1; i <= 9; i += 1) {
      const runDate = new Date(baseDate.getTime() + i * 2 * 60 * 1000);
      runDate.setHours(10, i, 0, 0);
      const runId = `main_run_${String(i).padStart(2, '0')}`;
      await writePendingRun({ uid: uidMain, runId, date: runDate, taskDifficulty: 'hard', distance: 1.5, duration: 720 });
      await waitForRunProcessed(uidMain, runId);
    }

    const badgesAfter9 = await getBadges(uidMain);
    const firstRunBadgeCount = badgesAfter9.filter((b) => b.badgeId === 'first_run').length;
    record('T402', firstRunBadgeCount === 1 ? 'PASS' : 'FAIL', `first_run badge count=${firstRunBadgeCount}`);

    record('T403', firstRunBadgeCount === 1 ? 'PASS' : 'FAIL', `idempotency check first_run count=${firstRunBadgeCount}`);

    const dnaEventsBefore10 = await getEvents(uidMain, 'dna_evolved');
    const userBefore10 = (await db.collection('users').doc(uidMain).get()).data() || {};
    const noDnaBefore10 = !userBefore10.dnaType && dnaEventsBefore10.length === 0;
    record('T406', noDnaBefore10 ? 'PASS' : 'FAIL', `dnaType=${userBefore10.dnaType || 'null'}, dnaEvents=${dnaEventsBefore10.length}`);

    const run10Date = new Date(baseDate.getTime() + 30 * 60 * 1000);
    run10Date.setHours(10, 40, 0, 0);
    await writePendingRun({ uid: uidMain, runId: 'main_run_10', date: run10Date, taskDifficulty: 'hard', distance: 1.5, duration: 720 });
    await waitForRunProcessed(uidMain, 'main_run_10');

    const userAfter10 = (await waitForDnaType(uidMain, null, 45000)) || (await db.collection('users').doc(uidMain).get()).data() || {};
    const dnaAfter10 = userAfter10.dnaType;
    record('T407', dnaAfter10 === 'speed_demon' ? 'PASS' : 'FAIL', `dnaType after run 10=${dnaAfter10 || 'null'}`);

    const dnaEventsAfter10 = (await waitForDnaEvent(uidMain, 45000)) || (await getEvents(uidMain, 'dna_evolved'));
    const dnaEventMessage = dnaEventsAfter10[0]?.payload?.message;
    record('T412', dnaEventsAfter10.length >= 1 && dnaEventMessage === 'Your Runner DNA has evolved!' ? 'PASS' : 'FAIL', `dnaEvents=${dnaEventsAfter10.length}, message=${dnaEventMessage || 'null'}`);

    const badgeEventsMain = await getEvents(uidMain, 'badge_unlocked');
    const hasMilestoneBadgeEvent = badgeEventsMain.some((e) => e.payload?.badgeId === 'first_run' && e.payload?.milestone === true);
    const hasNonMilestoneBadgeEvent = badgeEventsMain.some((e) => e.payload?.badgeId === 'total_km_10' && e.payload?.milestone === false);
    record('T404', hasMilestoneBadgeEvent && hasNonMilestoneBadgeEvent ? 'PASS' : 'FAIL', `milestoneEvent=${hasMilestoneBadgeEvent}, nonMilestoneEvent=${hasNonMilestoneBadgeEvent}`);

    for (let i = 11; i <= 20; i += 1) {
      const runDate = new Date(baseDate.getTime() + i * 2 * 60 * 1000);
      runDate.setHours(10, i % 60, 0, 0);
      const runId = `main_run_${String(i).padStart(2, '0')}`;
      await writePendingRun({ uid: uidMain, runId, date: runDate, taskDifficulty: 'hard', distance: 1.3, duration: 650 });
      await waitForRunProcessed(uidMain, runId);
    }

    const dnaEventsAfter20 = await getEvents(uidMain, 'dna_evolved');
    const userAfter20 = (await db.collection('users').doc(uidMain).get()).data() || {};
    const dnaHistory20 = Array.isArray(userAfter20.dnaHistory) ? userAfter20.dnaHistory : [];
    const unchangedHistory = dnaEventsAfter20.length === 1 && dnaHistory20.filter((type) => type === 'speed_demon').length === 1;
    record('T411', unchangedHistory ? 'PASS' : 'FAIL', `dnaEvents=${dnaEventsAfter20.length}, dnaHistory=${JSON.stringify(dnaHistory20)}`);

    await setUser(uidWindow, { runCount: 29, streakBreaksLast30: 5, dnaType: null, dnaHistory: [], homeTimezone: 'Asia/Kolkata' });
    const windowBase = new Date();

    for (let i = 1; i <= 35; i += 1) {
      const date = new Date(windowBase.getTime() - (36 - i) * 24 * 60 * 60 * 1000);
      if (i <= 5) {
        date.setHours(5, 15, 0, 0);
      } else {
        date.setHours(21, 10, 0, 0);
      }
      await seedValidRun({ uid: uidWindow, runId: `window_seed_${String(i).padStart(2, '0')}`, date, taskDifficulty: 'easy', distance: 1.8, duration: 1200 });
    }

    const triggerDate = new Date(windowBase.getTime() + 90 * 60 * 1000);
    triggerDate.setHours(21, 50, 0, 0);
    await writePendingRun({ uid: uidWindow, runId: 'window_trigger_30', date: triggerDate, taskDifficulty: 'easy', distance: 1.8, duration: 1100 });
    await waitForRunProcessed(uidWindow, 'window_trigger_30');

    const windowUserAfter = (await waitForDnaType(uidWindow, null, 45000)) || (await db.collection('users').doc(uidWindow).get()).data() || {};
    record('T408', windowUserAfter.dnaType === 'night_owl' ? 'PASS' : 'FAIL', `dnaType=${windowUserAfter.dnaType || 'null'} (expected night_owl)`);

    await setUser(uidComeback, { runCount: 9, streakBreaksLast30: 4, dnaType: null, dnaHistory: [], homeTimezone: 'Asia/Kolkata' });
    const comebackSeedBase = new Date();
    for (let i = 1; i <= 9; i += 1) {
      const date = new Date(comebackSeedBase.getTime() - (10 - i) * 24 * 60 * 60 * 1000);
      date.setHours(6, 10, 0, 0);
      await seedValidRun({ uid: uidComeback, runId: `comeback_seed_${String(i).padStart(2, '0')}`, date, taskDifficulty: 'hard', distance: 1.9, duration: 880 });
    }

    await db.collection('users').doc(uidComeback).collection('streakHistory').doc('break_1').set({
      streakLength: 5,
      startDate: '2026-03-01',
      endDate: '2026-03-05',
      endReason: 'reset',
      daysToReturn: 2,
    });
    await db.collection('users').doc(uidComeback).collection('streakHistory').doc('break_2').set({
      streakLength: 3,
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      endReason: 'reset',
      daysToReturn: 1,
    });

    const comebackDate = new Date();
    comebackDate.setHours(6, 30, 0, 0);
    await writePendingRun({ uid: uidComeback, runId: 'comeback_run_10', date: comebackDate, taskDifficulty: 'hard', distance: 2.1, duration: 900 });
    await waitForRunProcessed(uidComeback, 'comeback_run_10');

    const comebackUser = (await waitForDnaType(uidComeback, null, 45000)) || (await db.collection('users').doc(uidComeback).get()).data() || {};
    record('T409', comebackUser.dnaType === 'comeback_king' ? 'PASS' : 'FAIL', `dnaType=${comebackUser.dnaType || 'null'} (expected comeback_king)`);

    await setUser(uidRetain, {
      runCount: 9,
      streakBreaksLast30: 4,
      dnaType: 'night_owl',
      dnaHistory: ['night_owl'],
      homeTimezone: 'Asia/Kolkata',
    });

    const retainBase = new Date();
    for (let i = 1; i <= 9; i += 1) {
      const date = new Date(retainBase.getTime() - (10 - i) * 24 * 60 * 60 * 1000);
      if (i <= 5) {
        date.setHours(6, 20, 0, 0);
      } else {
        date.setHours(20, 15, 0, 0);
      }
      await seedValidRun({ uid: uidRetain, runId: `retain_seed_${String(i).padStart(2, '0')}`, date, taskDifficulty: 'easy', distance: 1.2, duration: 900 });
    }

    const retainTriggerDate = new Date();
    retainTriggerDate.setHours(13, 0, 0, 0);
    await writePendingRun({ uid: uidRetain, runId: 'retain_trigger_10', date: retainTriggerDate, taskDifficulty: 'easy', distance: 1.2, duration: 950 });
    await waitForRunProcessed(uidRetain, 'retain_trigger_10');

    const retainUserAfter = (await db.collection('users').doc(uidRetain).get()).data() || {};
    const retainEvents = await getEvents(uidRetain, 'dna_evolved');
    const retainHistory = Array.isArray(retainUserAfter.dnaHistory) ? retainUserAfter.dnaHistory : [];
    const retainPass = retainUserAfter.dnaType === 'night_owl' && retainEvents.length === 0;
    record('T410', retainPass ? 'PASS' : 'FAIL', `dnaType=${retainUserAfter.dnaType || 'null'}, dnaEvents=${retainEvents.length}`);

    if (!(retainHistory.length === 1 && retainHistory[0] === 'night_owl')) {
      record('T410', 'FAIL', `retain dnaHistory changed unexpectedly=${JSON.stringify(retainHistory)}`);
    }

    const rulesPath = path.resolve(__dirname, '../../firestore.rules');
    const rulesText = fs.readFileSync(rulesPath, 'utf8');
    const t405Pass = rulesText.includes('match /users/{userId}/badges/{badgeId}')
      && rulesText.includes('allow write: if false;');
    record('T405', t405Pass ? 'PASS' : 'FAIL', 'firestore.rules static check for badges write protection');

    const appNavigatorPath = path.resolve(__dirname, '../../src/navigation/AppNavigator.tsx');
    const t413Pass = checkStaticFileContains(appNavigatorPath, ['badge_unlocked', 'dna_evolved', 'autoSeenIds', 'markEventsSeen']);
    record('T413', t413Pass ? 'PASS' : 'FAIL', 'static AppNavigator event handling check');

    const profilePath = path.resolve(__dirname, '../../src/screens/profile/ProfileScreen.tsx');
    const t414Pass = checkStaticFileContains(profilePath, ['Runner DNA', 'dnaCard', 'formatDnaLabel']);
    record('T414', t414Pass ? 'PASS' : 'FAIL', 'static Profile DNA card rendering check');

    const t415Pass = (userAfter10.dnaType === 'speed_demon') && t414Pass;
    record('T415', t415Pass ? 'PASS' : 'FAIL', `backend dnaAssigned=${userAfter10.dnaType || 'null'}, profileCardStatic=${t414Pass}`);

    const passCount = results.filter((r) => r.status === 'PASS').length;
    const failCount = results.filter((r) => r.status === 'FAIL').length;
    const skipCount = results.filter((r) => r.status === 'SKIP').length;

    console.log('\n=== PHASE 4 MATRIX SUMMARY ===');
    console.log(JSON.stringify({ passCount, failCount, skipCount, total: results.length }, null, 2));
    console.log('DETAILS=' + JSON.stringify(results));

    process.exitCode = failCount > 0 ? 1 : 0;
  } finally {
    for (const uid of createdUsers) {
      await cleanupUser(uid).catch((error) => {
        console.error(`Cleanup failed for ${uid}:`, error.message || error);
      });
    }
  }
};

runMainTests().catch((error) => {
  console.error('Phase 4 matrix execution failed:', error);
  process.exit(1);
});
