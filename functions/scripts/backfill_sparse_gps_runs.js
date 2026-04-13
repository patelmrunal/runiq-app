#!/usr/bin/env node

/* eslint-disable no-console */

const admin = require('firebase-admin');

const args = process.argv.slice(2);

const getArgValue = (name, fallback) => {
  const exactIndex = args.findIndex((arg) => arg === name);
  if (exactIndex >= 0 && args[exactIndex + 1]) {
    return args[exactIndex + 1];
  }

  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  return fallback;
};

const hasFlag = (name) => args.includes(name);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

const projectId =
  getArgValue('--project', '') ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  'runiq-dev';

const applyChanges = hasFlag('--apply');
const maxRuns = Math.max(0, toNumber(getArgValue('--limit', '0'), 0));

const run = async () => {
  console.log('=== Sparse GPS Run Backfill v1 ===');
  console.log(`Project: ${projectId}`);
  console.log(`Mode: ${applyChanges ? 'APPLY' : 'DRY-RUN'}`);
  if (maxRuns > 0) {
    console.log(`Limit: ${maxRuns}`);
  }

  admin.initializeApp({ projectId });
  const db = admin.firestore();

  const usersSnap = await db.collection('users').where('isActive', '!=', false).get();

  const allCandidates = [];
  let skippedAlreadyBackfilled = 0;
  let skippedInvalidPayload = 0;
  let skippedImpossiblePace = 0;

  let flaggedFound = 0;

  for (const userDoc of usersSnap.docs) {
    const runSnap = await userDoc.ref.collection('runLog').where('status', '==', 'flagged').get();

    runSnap.docs.forEach((docSnap) => {
      flaggedFound += 1;
      const data = docSnap.data() || {};

      if (String(data.flagReason || '') !== 'sparse_gps') {
        return;
      }

      if (data.sparseGpsBackfillV1Applied === true) {
        skippedAlreadyBackfilled += 1;
        return;
      }

      const distanceKm = Math.max(0, toNumber(data.distance, 0));
      const durationSeconds = Math.max(0, toNumber(data.duration, 0));

      if (distanceKm <= 0 || durationSeconds <= 0) {
        skippedInvalidPayload += 1;
        return;
      }

      const avgPaceMinPerKm = durationSeconds / 60 / distanceKm;
      if (avgPaceMinPerKm < 2.5) {
        skippedImpossiblePace += 1;
        return;
      }

      const parts = docSnap.ref.path.split('/');
      const uid = parts[1] || '';
      const runId = parts[3] || docSnap.id;

      if (!uid) {
        skippedInvalidPayload += 1;
        return;
      }

      allCandidates.push({
        uid,
        runId,
        ref: docSnap.ref,
        distanceKm,
        durationSeconds,
        avgPaceMinPerKm,
      });
    });
  }

  const candidates = maxRuns > 0 ? allCandidates.slice(0, maxRuns) : allCandidates;

  const totalDistanceKm = candidates.reduce((sum, item) => sum + item.distanceKm, 0);
  const usersTouched = new Set(candidates.map((item) => item.uid)).size;

  console.log('');
  console.log('=== Candidate Summary ===');
  console.log(`Active users scanned: ${usersSnap.size}`);
  console.log(`Flagged runs found: ${flaggedFound}`);
  console.log(`Eligible candidates: ${candidates.length}`);
  console.log(`Unique users touched: ${usersTouched}`);
  console.log(`Total distance to restore: ${totalDistanceKm.toFixed(2)} km`);
  console.log(`Skipped already backfilled: ${skippedAlreadyBackfilled}`);
  console.log(`Skipped invalid payload: ${skippedInvalidPayload}`);
  console.log(`Skipped impossible pace: ${skippedImpossiblePace}`);

  if (candidates.length > 0) {
    console.log('Sample candidates:');
    candidates.slice(0, 10).forEach((item) => {
      console.log(
        `- uid=${item.uid}, runId=${item.runId}, distance=${item.distanceKm.toFixed(2)}km, avgPace=${item.avgPaceMinPerKm.toFixed(2)}min/km`
      );
    });
  }

  if (!applyChanges) {
    console.log('');
    console.log('Dry-run complete. No writes were made.');
    console.log('Use --apply to execute backfill.');
    return;
  }

  if (candidates.length === 0) {
    console.log('No eligible candidates to backfill.');
    return;
  }

  const batches = chunk(candidates, 200);
  let updatedRuns = 0;

  for (let i = 0; i < batches.length; i += 1) {
    const batch = db.batch();
    const entries = batches[i];

    entries.forEach((item) => {
      const userRef = db.collection('users').doc(item.uid);

      batch.set(
        userRef,
        {
          runCount: admin.firestore.FieldValue.increment(1),
          totalKm: admin.firestore.FieldValue.increment(item.distanceKm),
          lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      batch.set(
        item.ref,
        {
          status: 'valid',
          flagReason: 'sparse_gps_warning',
          sparseGpsBackfillV1Applied: true,
          sparseGpsBackfillV1AppliedAt: admin.firestore.FieldValue.serverTimestamp(),
          sparseGpsBackfillV1Source: 'qa_hotfix_2026_04_11',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          backfillNotes: 'counts_only_no_streak_retro',
        },
        { merge: true }
      );
    });

    await batch.commit();
    updatedRuns += entries.length;
    console.log(`Committed batch ${i + 1}/${batches.length} (${entries.length} runs)`);
  }

  console.log('');
  console.log('=== Backfill Apply Summary ===');
  console.log(`Runs updated: ${updatedRuns}`);
  console.log(`Users touched: ${usersTouched}`);
  console.log(`Distance restored: ${totalDistanceKm.toFixed(2)} km`);
  console.log('Streak was not recalculated retroactively in this safe backfill.');
};

run().catch((error) => {
  console.error('Backfill failed:');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
