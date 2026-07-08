/**
 * One-time / maintenance backfill for ExerciseResult + ExerciseSession focus fields.
 * Persists values that read-time enrichment already computes for charts / leaderboard.
 */

const { Op } = require('sequelize');
const { ExerciseResult, ExerciseSession } = require('../../models');
const {
  isExerciseSlotEnded,
  resolveInactivityCountOnComplete,
  focusScoreFromCounts,
} = require('../dashboard/leaderboardMetrics');
const { updateSessionStats } = require('./exerciseResult.service');

const normalizeEndedResultFocus = (result) => {
  const inactivityCount = resolveInactivityCountOnComplete(result, {
    movesCount: result.movesCount,
    durationSec: result.duration ?? 0,
  });
  const pauseCount = result.pauseCount ?? 0;
  return {
    inactivityCount,
    focusScore: focusScoreFromCounts(pauseCount, inactivityCount),
  };
};

/**
 * @param {{ dryRun?: boolean, patientId?: number }} options
 * @returns {Promise<{ resultsScanned: number, resultsUpdated: number, sessionsProcessed: number }>}
 */
const backfillFocusScores = async ({ dryRun = false, patientId = null } = {}) => {
  const resultWhere = { deleted: false };
  if (patientId != null) {
    resultWhere.patientId = patientId;
  }

  const results = await ExerciseResult.findAll({
    where: resultWhere,
    order: [['id', 'ASC']],
  });

  let resultsUpdated = 0;
  const sessionIds = new Set();

  // eslint-disable-next-line no-restricted-syntax -- sequential updates per row for clarity
  for (const result of results) {
    if (!isExerciseSlotEnded(result)) continue;

    const normalized = normalizeEndedResultFocus(result);
    const changed =
      (result.inactivityCount ?? 0) !== normalized.inactivityCount ||
      (result.focusScore ?? 100) !== normalized.focusScore;

    if (changed) {
      resultsUpdated += 1;
      if (!dryRun) {
        // eslint-disable-next-line no-await-in-loop
        await result.update({
          inactivityCount: normalized.inactivityCount,
          focusScore: normalized.focusScore,
        });
      }
    }

    if (result.exerciseSessionId) {
      sessionIds.add(result.exerciseSessionId);
    }
  }

  if (!dryRun) {
    // eslint-disable-next-line no-restricted-syntax -- updateSessionStats must see committed result rows
    for (const sessionId of sessionIds) {
      // eslint-disable-next-line no-await-in-loop
      await updateSessionStats(sessionId);
    }
  }

  return {
    resultsScanned: results.length,
    resultsUpdated,
    sessionsProcessed: sessionIds.size,
    dryRun,
  };
};

module.exports = {
  normalizeEndedResultFocus,
  backfillFocusScores,
};
