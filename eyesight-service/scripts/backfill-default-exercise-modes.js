#!/usr/bin/env node
/**
 * Backfill system-default training modes for all existing centers.
 *
 * Prefer automatic sync: API boot (src/index.js) and exercise-config list
 * already call the same ensure/backfill helpers. Use this script for
 * one-off ops or when you need a CLI report without restarting the API.
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
  const { centers, created, skipped, summary } =
    await backfillDefaultExerciseModesForAllCenters(null);
  for (const row of summary) {
    console.log(
      `[${row.code}] ${row.name}: created=${row.created}, skipped=${row.skipped}`
    );
  }
  console.log(
    `Done. Centers=${centers}, modes created=${created}, skipped=${skipped}`
  );
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
