/* eslint-disable no-console */
const admin = require('firebase-admin');

const PROJECT_ID = 'runiq-dev';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

const PUBSUB_HOST = process.env.PUBSUB_EMULATOR_HOST || '127.0.0.1:8085';
const FUNCTIONS_HOST = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fmtDayKey = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  return `${map.year}-${map.month}-${map.day}`;
};

const ensurePubsubTopic = async (topic) => {
  const url = `http://${PUBSUB_HOST}/v1/projects/${PROJECT_ID}/topics/${topic}`;
  const response = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create topic ${topic}: ${response.status} ${text}`);
  }
};

const publishSchedulerTopic = async (topic) => {
  await ensurePubsubTopic(topic);
  const url = `http://${PUBSUB_HOST}/v1/projects/${PROJECT_ID}/topics/${topic}:publish`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ data: Buffer.from('{}').toString('base64') }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to publish topic ${topic}: ${response.status} ${text}`);
  }
};

const invokeScheduledFunction = async (functionName) => {
  const url = `http://${FUNCTIONS_HOST}/${PROJECT_ID}/asia-south1/${functionName}-0`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to invoke ${functionName}: ${response.status} ${text}`);
  }
};

const waitFor = async (label, checkFn, timeoutMs = 15000, intervalMs = 500) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await checkFn();
    if (ok) return true;
    await sleep(intervalMs);
  }
  throw new Error(`Timeout waiting for condition: ${label}`);
};

const setUserDoc = async (uid, data) => {
  const userRef = db.collection('users').doc(uid);
  await userRef.set(
    {
      uid,
      email: `${uid}@example.com`,
      username: uid,
      displayName: uid,
      createdAt: Timestamp.now(),
      lastActiveAt: Timestamp.now(),
      tier: 'basic',
      premiumExpiresAt: null,
      isActive: true,
      homeCity: 'Surat',
      homeState: 'Gujarat',
      homeTimezone: 'Asia/Kolkata',
      homeCoords: { lat: 0, lng: 0 },
      dnaType: 'discovering',
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
      onboarding: { runFrequency: null, preferredTime: null, primaryGoal: null },
      buddyUid: null,
      buddyRequestSentTo: null,
      buddyRequestReceivedFrom: null,
      ...data,
    },
    { merge: true }
  );
  return userRef;
};

const writeValidRun = async (uid, runId, overrides = {}) => {
  const now = new Date();
  const start = new Date(now.getTime() - 20 * 60 * 1000);
  const runRef = db.collection('users').doc(uid).collection('runLog').doc(runId);

  await runRef.set({
    runId,
    userId: uid,
    createdAt: Timestamp.fromDate(now),
    taskId: 'task_easy_1',
    taskTitle: 'Morning 2K',
    taskDifficulty: 'easy',
    taskTargetKm: 2,
    taskTargetMinutes: 20,
    startTime: Timestamp.fromDate(start),
    endTime: Timestamp.fromDate(now),
    duration: 1200,
    distance: 2.2,
    avgPace: 9.1,
    calories: 160,
    routePolyline: 'encoded_polyline',
    routePointCount: 30,
    startCoordHash: 'abcd',
    city: 'Surat',
    weather: { condition: 'clear', tempC: 30, wasRaining: false },
    phoneDND: false,
    status: 'pending',
    processedAt: null,
    flagReason: null,
    ...overrides,
  });

  return runRef;
};

const seedTaskTemplates = async () => {
  const tasks = [
    { id: 'task_easy_1', difficulty: 'easy', targetKm: 2, targetMinutes: 20, levelRequired: 1, title: 'Morning 2K' },
    { id: 'task_medium_1', difficulty: 'medium', targetKm: 4, targetMinutes: 30, levelRequired: 1, title: 'Tempo 4K' },
    { id: 'task_hard_1', difficulty: 'hard', targetKm: 6, targetMinutes: 45, levelRequired: 1, title: 'Power 6K' },
    { id: 'task_hard_2', difficulty: 'hard', targetKm: 8, targetMinutes: 55, levelRequired: 2, title: 'Beast 8K' },
  ];

  const batch = db.batch();
  tasks.forEach((task) => {
    batch.set(db.collection('auto').doc(task.id), {
      title: task.title,
      description: 'Generated for emulator matrix',
      difficulty: task.difficulty,
      targetKm: task.targetKm,
      targetMinutes: task.targetMinutes,
      levelRequired: task.levelRequired,
      isActive: true,
    }, { merge: true });
  });
  await batch.commit();
};

const clearUserData = async (uid) => {
  const userRef = db.collection('users').doc(uid);
  const subcollections = ['runLog', 'dailyTasks', 'events', 'devices'];

  for (const name of subcollections) {
    const snap = await userRef.collection(name).get();
    const batch = db.batch();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }

  await userRef.delete().catch(() => {});
};

const testResults = [];
const record = (id, status, notes) => {
  testResults.push({ id, status, notes });
  console.log(`${id} -> ${status}: ${notes}`);
};

const run = async () => {
  console.log('Phase 3 emulator matrix starting...');
  await seedTaskTemplates();

  const tzMidnight = 'Asia/Kolkata';
  const tzTenPm = 'Asia/Kolkata';
  const tzElevenThirty = 'Asia/Kolkata';
  const tzTimezoneCheck = 'Pacific/Honolulu';

  console.log('Timezone windows', { tzMidnight, tzTenPm, tzElevenThirty });

  const now = new Date();
  const todayIst = fmtDayKey(now, 'Asia/Kolkata');
  const yesterdayIst = fmtDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000), 'Asia/Kolkata');

  try {
    // T01 + T02 + T07
    const uidRun = 'p3_t_run';
    await clearUserData(uidRun);
    await setUserDoc(uidRun, {
      currentStreak: 4,
      longestStreak: 4,
      level: 1,
      lastRunDate: yesterdayIst,
      ranTodayFlag: false,
      homeTimezone: 'Asia/Kolkata',
    });

    await writeValidRun(uidRun, 'run_1');

    await waitFor('run_1 processed', async () => {
      const runSnap = await db.collection('users').doc(uidRun).collection('runLog').doc('run_1').get();
      return runSnap.exists && runSnap.data().status === 'valid';
    });

    const userAfterRun1 = (await db.collection('users').doc(uidRun).get()).data();
    const eventsAfterRun1 = await db.collection('users').doc(uidRun).collection('events').where('type', '==', 'level_up').get();

    const t01Pass = userAfterRun1.currentStreak === 5;
    record('T01', t01Pass ? 'PASS' : 'FAIL', `currentStreak=${userAfterRun1.currentStreak} expected=5`);

    const t07Pass = userAfterRun1.level === 2 && eventsAfterRun1.size >= 1;
    record('T07', t07Pass ? 'PASS' : 'FAIL', `level=${userAfterRun1.level}, levelUpEvents=${eventsAfterRun1.size}`);

    await writeValidRun(uidRun, 'run_2');

    await waitFor('run_2 processed', async () => {
      const runSnap = await db.collection('users').doc(uidRun).collection('runLog').doc('run_2').get();
      return runSnap.exists && runSnap.data().status === 'valid';
    });

    const userAfterRun2 = (await db.collection('users').doc(uidRun).get()).data();
    const t02Pass = userAfterRun2.currentStreak === 5;
    record('T02', t02Pass ? 'PASS' : 'FAIL', `currentStreak=${userAfterRun2.currentStreak} expected=5`);

    // T08
    await invokeScheduledFunction('phase3DailyTaskBackfillCron');

    await waitFor('daily tasks assigned', async () => {
      const taskSnap = await db.collection('users').doc(uidRun).collection('dailyTasks').get();
      return taskSnap.size >= 3;
    });

    const dailyTasksSnap = await db.collection('users').doc(uidRun).collection('dailyTasks').get();
    record('T08', dailyTasksSnap.size >= 3 ? 'PASS' : 'FAIL', `dailyTasksCount=${dailyTasksSnap.size}`);

    // T03/T04/T09 midnight flow
    const todayMidnightZone = fmtDayKey(now, tzMidnight);
    const twoDaysAgoMidnightZone = fmtDayKey(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), tzMidnight);

    const uidShield = 'p3_t_midnight_shield';
    await clearUserData(uidShield);
    await setUserDoc(uidShield, {
      homeTimezone: tzMidnight,
      currentStreak: 12,
      level: 3,
      lastRunDate: twoDaysAgoMidnightZone,
      shieldsAvailable: 1,
      lastMidnightEvalDate: null,
    });

    const uidNoShield = 'p3_t_midnight_reset';
    await clearUserData(uidNoShield);
    await setUserDoc(uidNoShield, {
      homeTimezone: tzMidnight,
      currentStreak: 9,
      level: 2,
      lastRunDate: twoDaysAgoMidnightZone,
      shieldsAvailable: 0,
      lastMidnightEvalDate: null,
    });

    await invokeScheduledFunction('phase3MidnightCron');

    await waitFor('midnight eval applied', async () => {
      const u1 = (await db.collection('users').doc(uidShield).get()).data();
      const u2 = (await db.collection('users').doc(uidNoShield).get()).data();
      return u1.lastMidnightEvalDate === todayMidnightZone && u2.lastMidnightEvalDate === todayMidnightZone;
    }, 20000);

    const shieldUser = (await db.collection('users').doc(uidShield).get()).data();
    const resetUser = (await db.collection('users').doc(uidNoShield).get()).data();

    record('T03', shieldUser.shieldsAvailable === 0 && shieldUser.currentStreak === 12 ? 'PASS' : 'FAIL', `shields=${shieldUser.shieldsAvailable}, streak=${shieldUser.currentStreak}`);
    record('T04', resetUser.currentStreak === 0 && resetUser.level === 1 ? 'PASS' : 'FAIL', `streak=${resetUser.currentStreak}, level=${resetUser.level}`);

    await invokeScheduledFunction('phase3MidnightCron');
    await sleep(1500);
    const shieldUserAfterReplay = (await db.collection('users').doc(uidShield).get()).data();
    record('T09', shieldUserAfterReplay.shieldsAvailable === 0 ? 'PASS' : 'FAIL', `shields after replay=${shieldUserAfterReplay.shieldsAvailable}`);

    // T05/T06/T10 reminder windows
    const uidTenPm = 'p3_t_10pm';
    await clearUserData(uidTenPm);
    await setUserDoc(uidTenPm, {
      homeTimezone: tzTenPm,
      currentStreak: 7,
      lastRunDate: yesterdayIst,
      ranTodayFlag: false,
    });

    await invokeScheduledFunction('phase3TenPmReminderCron');

    await waitFor('10pm marker set', async () => {
      const data = (await db.collection('users').doc(uidTenPm).get()).data();
      return Boolean(data.lastTenPmReminderDate);
    }, 20000);

    const tenPmUser = (await db.collection('users').doc(uidTenPm).get()).data();
    record('T05', Boolean(tenPmUser.lastTenPmReminderDate) ? 'PASS' : 'FAIL', `lastTenPmReminderDate=${tenPmUser.lastTenPmReminderDate || 'null'}`);

    const uid1130 = 'p3_t_1130';
    await clearUserData(uid1130);
    await setUserDoc(uid1130, {
      homeTimezone: tzElevenThirty,
      currentStreak: 7,
      lastRunDate: yesterdayIst,
      ranTodayFlag: false,
      shieldsAvailable: 1,
    });

    await invokeScheduledFunction('phase3ElevenThirtyReminderCron');

    await waitFor('1130 marker set', async () => {
      const data = (await db.collection('users').doc(uid1130).get()).data();
      return Boolean(data.lastElevenThirtyReminderDate);
    }, 20000);

    const user1130 = (await db.collection('users').doc(uid1130).get()).data();
    record('T06', Boolean(user1130.lastElevenThirtyReminderDate) ? 'PASS' : 'FAIL', `lastElevenThirtyReminderDate=${user1130.lastElevenThirtyReminderDate || 'null'}`);

    const uidTimezoneCheck = 'p3_t_timezone';
    await clearUserData(uidTimezoneCheck);
    await setUserDoc(uidTimezoneCheck, {
      homeTimezone: tzTimezoneCheck,
      currentStreak: 4,
      lastRunDate: fmtDayKey(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), tzTimezoneCheck),
      shieldsAvailable: 1,
      lastMidnightEvalDate: null,
    });

    await invokeScheduledFunction('phase3MidnightCron');
    await waitFor('timezone eval marker', async () => {
      const data = (await db.collection('users').doc(uidTimezoneCheck).get()).data();
      return Boolean(data.lastMidnightEvalDate);
    }, 20000);

    const timezoneUser = (await db.collection('users').doc(uidTimezoneCheck).get()).data();
    const expectedZoneDayKey = fmtDayKey(now, tzTimezoneCheck);
    record('T10', timezoneUser.lastMidnightEvalDate === expectedZoneDayKey ? 'PASS' : 'FAIL', `lastMidnightEvalDate=${timezoneUser.lastMidnightEvalDate}, expected=${expectedZoneDayKey}`);

    const passCount = testResults.filter((r) => r.status === 'PASS').length;
    const failCount = testResults.filter((r) => r.status === 'FAIL').length;
    const skipCount = testResults.filter((r) => r.status === 'SKIP').length;

    console.log('\n=== SUMMARY ===');
    console.log(JSON.stringify({ passCount, failCount, skipCount, total: testResults.length }, null, 2));
    console.log('DETAILS=' + JSON.stringify(testResults));

    process.exit(failCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('Matrix execution error:', error);
    process.exit(1);
  }
};

run();
