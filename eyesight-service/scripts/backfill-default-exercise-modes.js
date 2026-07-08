#!/usr/bin/env node
/**
 * Backfill system-default training modes (15 admin configs) for all existing centers.
 *
 * Usage (from eyesight-service):
 *   node scripts/backfill-default-exercise-modes.js
 */
require('dotenv').config();

const {
  backfillDefaultExerciseModesForAllCenters,
} = require('../src/services/system/defaultExerciseModes.service');
const { DEFAULT_EXERCISE_MODES } = require('../src/config/defaultExerciseModes');

(async () => {
  console.log(`Catalog size: ${DEFAULT_EXERCISE_MODES.length} modes`);
  const summary = await backfillDefaultExerciseModesForAllCenters(null);
  for (const row of summary) {
    console.log(
      `[${row.code}] ${row.name}: created=${row.created}, skipped=${row.skipped}`
    );
  }
  const totalCreated = summary.reduce((n, r) => n + r.created, 0);
  console.log(`Done. Total modes created: ${totalCreated}`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
