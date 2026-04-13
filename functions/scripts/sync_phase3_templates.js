#!/usr/bin/env node

/* eslint-disable no-console */

const admin = require('firebase-admin');
const { templates, summarizeTemplates } = require('./phase3_template_catalog');

const args = process.argv.slice(2);

const getArgValue = (name, fallback) => {
  const prefix = `${name}=`;
  const direct = args.find((arg) => arg.startsWith(prefix));
  if (!direct) return fallback;
  return direct.slice(prefix.length);
};

const hasFlag = (name) => args.includes(name);

const projectId =
  getArgValue('--project', '')
  || process.env.GCLOUD_PROJECT
  || process.env.GOOGLE_CLOUD_PROJECT
  || 'runiq-dev';

const collectionName = getArgValue('--collection', 'auto');
const applyChanges = hasFlag('--apply');
const deactivateMissing = hasFlag('--deactivate-missing');

const printableTask = (task) => ({
  id: task.id,
  difficulty: task.difficulty,
  levelRequired: task.levelRequired,
  targetKm: task.targetKm,
  targetMinutes: task.targetMinutes,
  title: task.title,
});

const normalizeForCompare = (data) => ({
  title: typeof data.title === 'string' ? data.title : '',
  description: typeof data.description === 'string' ? data.description : '',
  difficulty: typeof data.difficulty === 'string' ? data.difficulty.toLowerCase() : 'easy',
  targetKm: Number(data.targetKm || 0),
  targetMinutes: Number(data.targetMinutes ?? data.targetMin ?? 0),
  levelRequired: Number(data.levelRequired || 1),
  isActive: data.isActive !== false,
});

const areEqualTemplateFields = (left, right) => {
  return JSON.stringify(normalizeForCompare(left)) === JSON.stringify(normalizeForCompare(right));
};

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

const run = async () => {
  const summary = summarizeTemplates(templates);

  console.log('=== Phase 3 Template Catalog ===');
  console.log(`Project: ${projectId}`);
  console.log(`Collection: ${collectionName}`);
  console.log(`Mode: ${applyChanges ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Deactivate missing docs: ${deactivateMissing ? 'YES' : 'NO'}`);
  console.log(`Template count: ${summary.total}`);
  console.log(`By difficulty: ${JSON.stringify(summary.byDifficulty)}`);
  console.log(`By level: ${JSON.stringify(summary.byLevel)}`);
  console.log('User daily visibility: basic users see 3 tasks/day, premium users can see up to 4/day (bonus hard task).');
  console.log('');

  console.log('Sample templates:');
  templates.slice(0, 5).forEach((task) => {
    console.log(`- ${JSON.stringify(printableTask(task))}`);
  });
  console.log('');

  if (!applyChanges) {
    console.log('Dry-run complete. No Firestore writes were made.');
    console.log('Use --apply to write templates to Firestore.');
    return;
  }

  admin.initializeApp({ projectId });
  const db = admin.firestore();
  const colRef = db.collection(collectionName);

  const existingSnap = await colRef.get();
  const existingById = new Map();
  existingSnap.docs.forEach((docSnap) => {
    existingById.set(docSnap.id, docSnap.data() || {});
  });

  const creates = [];
  const updates = [];
  let unchanged = 0;

  templates.forEach((task) => {
    const payload = {
      title: task.title,
      description: task.description,
      difficulty: task.difficulty,
      targetKm: task.targetKm,
      targetMinutes: task.targetMinutes,
      levelRequired: task.levelRequired,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const previous = existingById.get(task.id);
    if (!previous) {
      creates.push({ id: task.id, payload: { ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() } });
      return;
    }

    if (areEqualTemplateFields(previous, payload)) {
      unchanged += 1;
      return;
    }

    updates.push({ id: task.id, payload });
  });

  const missingDocs = existingSnap.docs
    .map((docSnap) => docSnap.id)
    .filter((id) => !templates.some((template) => template.id === id));

  const deactivateOps = deactivateMissing
    ? missingDocs.map((id) => ({
        id,
        payload: {
          isActive: false,
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      }))
    : [];

  const allOps = [
    ...creates.map((item) => ({ type: 'set', ...item })),
    ...updates.map((item) => ({ type: 'set', ...item })),
    ...deactivateOps.map((item) => ({ type: 'update', ...item })),
  ];

  const batches = chunk(allOps, 400);

  for (const [index, ops] of batches.entries()) {
    const batch = db.batch();
    ops.forEach((op) => {
      const ref = colRef.doc(op.id);
      if (op.type === 'update') {
        batch.set(ref, op.payload, { merge: true });
      } else {
        batch.set(ref, op.payload, { merge: true });
      }
    });

    await batch.commit();
    console.log(`Committed batch ${index + 1}/${batches.length} with ${ops.length} operations.`);
  }

  console.log('');
  console.log('=== Apply Summary ===');
  console.log(`Created: ${creates.length}`);
  console.log(`Updated: ${updates.length}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Deactivated missing: ${deactivateOps.length}`);
  console.log(`Previously existing docs in ${collectionName}: ${existingSnap.size}`);

  const changedIds = [...creates.map((x) => x.id), ...updates.map((x) => x.id), ...deactivateOps.map((x) => x.id)];
  console.log(`Changed doc IDs (${changedIds.length}):`);
  changedIds.slice(0, 30).forEach((id) => console.log(`- ${id}`));
  if (changedIds.length > 30) {
    console.log(`...and ${changedIds.length - 30} more`);
  }
};

run().catch((error) => {
  console.error('Template sync failed:');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
