/**
 * Keep ExerciseSession executionDuration / executionCount snapshots aligned with the
 * assignment's current ExerciseConfig when config is customized or reassigned.
 *
 * Incomplete sessions only — completed history stays frozen.
 */

const { ExerciseAssignment, ExerciseConfig, ExerciseSession } = require('../../models');

const parseDuration = (value) => {
  if (value == null || value === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

const parseExecutionCount = (value) => {
  if (value == null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
};

const snapshotsDiffer = (session, duration, executionCount) => {
  const sessionDur = parseDuration(session.executionDuration);
  const configDur = parseDuration(duration);
  const sessionCount = parseExecutionCount(session.executionCount);
  const configCount = parseExecutionCount(executionCount);

  return sessionDur !== configDur || sessionCount !== configCount;
};

/**
 * @param {import('../../models').ExerciseSession} session
 * @param {{ exerciseConfig?: { duration?: number|null, executionCount?: number|null } }} assignment
 * @param {{ recalculateStats?: boolean }} [options]
 * @returns {Promise<boolean>} true when snapshot was updated
 */
const syncSessionSnapshotFromAssignment = async (session, assignment, { recalculateStats = true } = {}) => {
  if (!session || session.status !== 'incomplete') {
    return false;
  }

  const duration = assignment.exerciseConfig?.duration ?? null;
  const executionCount = assignment.exerciseConfig?.executionCount ?? null;

  if (!snapshotsDiffer(session, duration, executionCount)) {
    return false;
  }

  await session.update({
    executionDuration: duration,
    executionCount,
  });

  if (recalculateStats) {
    // Lazy require avoids circular dependency with exerciseResult.service
    // eslint-disable-next-line global-require
    const { updateSessionStats } = require('./exerciseResult.service');
    await updateSessionStats(session.id);
  }

  return true;
};

/**
 * Align all incomplete sessions for an assignment with its current exercise config.
 *
 * @param {number} assignmentId
 * @param {{ recalculateStats?: boolean }} [options]
 * @returns {Promise<{ updated: number }>}
 */
const syncAssignmentSessionSnapshots = async (assignmentId, { recalculateStats = true } = {}) => {
  const assignment = await ExerciseAssignment.findByPk(assignmentId, {
    include: [{ model: ExerciseConfig, as: 'exerciseConfig' }],
  });

  if (!assignment?.exerciseConfig) {
    return { updated: 0 };
  }

  const incompleteSessions = await ExerciseSession.findAll({
    where: {
      exerciseAssignmentId: assignmentId,
      status: 'incomplete',
    },
  });

  let updated = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const session of incompleteSessions) {
    // eslint-disable-next-line no-await-in-loop
    const changed = await syncSessionSnapshotFromAssignment(session, assignment, { recalculateStats });
    if (changed) {
      updated += 1;
    }
  }

  return { updated };
};

/**
 * When a shared exercise config's timing fields change, refresh incomplete sessions
 * for every active assignment that references it.
 *
 * @param {number} exerciseConfigId
 * @param {{ recalculateStats?: boolean }} [options]
 * @returns {Promise<{ assignments: number, sessionsUpdated: number }>}
 */
const syncSessionsForExerciseConfig = async (exerciseConfigId, options = {}) => {
  const assignments = await ExerciseAssignment.findAll({
    where: {
      exerciseConfigId,
      status: 'active',
    },
    attributes: ['id'],
  });

  let sessionsUpdated = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const assignment of assignments) {
    // eslint-disable-next-line no-await-in-loop
    const { updated } = await syncAssignmentSessionSnapshots(assignment.id, options);
    sessionsUpdated += updated;
  }

  return { assignments: assignments.length, sessionsUpdated };
};

module.exports = {
  snapshotsDiffer,
  syncSessionSnapshotFromAssignment,
  syncAssignmentSessionSnapshots,
  syncSessionsForExerciseConfig,
};
