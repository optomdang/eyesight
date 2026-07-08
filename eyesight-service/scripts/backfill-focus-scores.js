/**
 * Recalculate focusScore / inactivityCount on ExerciseResults and refresh ExerciseSessions.
 *
 * Run after deploying the focus-aggregation fix so historical data matches new logic.
 *
 *   node scripts/backfill-focus-scores.js
 *   node scripts/backfill-focus-scores.js --dry-run
 *   node scripts/backfill-focus-scores.js --patient-id=42
 */

const { backfillFocusScores } = require('../src/services/exercise/focusScoreBackfill.service');

const parseArgs = () => {
  const dryRun = process.argv.includes('--dry-run');
  const patientArg = process.argv.find((arg) => arg.startsWith('--patient-id='));
  const patientId = patientArg ? Number(patientArg.split('=')[1]) : null;
  return { dryRun, patientId: Number.isFinite(patientId) ? patientId : null };
};

async function main() {
  const { dryRun, patientId } = parseArgs();
  console.log(`🔧 Backfill focus scores${dryRun ? ' (dry run)' : ''}...`);
  if (patientId != null) {
    console.log(`   Scope: patientId=${patientId}`);
  }

  const summary = await backfillFocusScores({ dryRun, patientId });
  console.log('\n✅ Done');
  console.log(`   Results scanned: ${summary.resultsScanned}`);
  console.log(`   Results ${dryRun ? 'would update' : 'updated'}: ${summary.resultsUpdated}`);
  console.log(`   Sessions ${dryRun ? 'would refresh' : 'refreshed'}: ${summary.sessionsProcessed}`);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Backfill failed:', error);
  process.exit(1);
});
