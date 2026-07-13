#!/usr/bin/env node
/**
 * One-shot: align incomplete session snapshots with current assignment configs
 * and recalculate session stats (validExecutions, status, compliance inputs).
 *
 * Usage (on server, from eyesight-service root):
 *   node scripts/sync-all-assignment-sessions.js
 *   node scripts/sync-all-assignment-sessions.js --patientId 123
 *   node scripts/sync-all-assignment-sessions.js --assignmentId 8
 */
require('dotenv').config();

const { ExerciseAssignment } = require('../src/models');
const { syncAssignmentSessionSnapshots } = require('../src/services/exercise/assignmentSessionSync.service');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith('--')) {
      out[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const where = { status: 'active' };
  if (args.patientId) where.patientId = Number(args.patientId);
  if (args.assignmentId) where.id = Number(args.assignmentId);

  const assignments = await ExerciseAssignment.findAll({
    where,
    attributes: ['id', 'patientId'],
    order: [['id', 'ASC']],
  });

  if (!assignments.length) {
    console.log('No active assignments matched.');
    process.exit(0);
  }

  let sessionsUpdated = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const assignment of assignments) {
    // eslint-disable-next-line no-await-in-loop
    const { updated } = await syncAssignmentSessionSnapshots(assignment.id);
    if (updated > 0) {
      console.log(
        `Assignment ${assignment.id} (patient ${assignment.patientId}): synced ${updated} session(s)`
      );
      sessionsUpdated += updated;
    }
  }

  console.log(
    `Done. ${sessionsUpdated} incomplete session(s) updated across ${assignments.length} assignment(s).`
  );
  console.log(
    'Tip: portal % tuân thủ refreshes on GET /v1/me/assignments (patient opens exercise list).'
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
