/**
 * Exercise Stale Result Service
 *
 * Handles auto-closing of incomplete exercise results that have crossed a day boundary.
 *
 * Business rule confirmed by BA (Optom Dang, 05/04/2026):
 *   "Tạm dừng mà qua ngày không tập tiếp thì lần tạm dừng đó cũng đóng lại như kết thúc
 *    và ghi nhận các chỉ số tại điểm tạm dừng."
 *   (A paused result that crosses the day boundary should be auto-closed like pressing
 *    "Kết thúc", recording the metrics saved at the pause point.)
 */

const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { ExerciseResult } = require('../../models');
const { updateSessionStats } = require('./exerciseResult.service');
const { focusScoreFromResult } = require('../dashboard/leaderboardMetrics');

/**
 * Auto-close all incomplete exercise results that were last updated before today (midnight).
 * Called once daily (e.g. at 00:05 AM) to clean up day-crossing paused results.
 *
 * @returns {Promise<{closed: number, errors: number}>}
 */
const closeStaleIncompleteResults = async () => {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const staleResults = await ExerciseResult.findAll({
    where: {
      status: 'incomplete',
      deleted: false,
      updatedAt: { [Op.lt]: todayMidnight },
    },
  });

  if (staleResults.length === 0) {
    logger.info('Stale result cleanup: no incomplete results from previous days found.');
    return { closed: 0, errors: 0 };
  }

  logger.info(`Stale result cleanup: found ${staleResults.length} result(s) to auto-close.`);

  let closed = 0;
  let errors = 0;

  // eslint-disable-next-line no-await-in-loop -- intentional sequential processing: individual try/catch per result
  for (const result of staleResults) {
    try {
      // Auto-close: giữ duration/focus tại điểm pause; status giữ incomplete nếu <80% thời gian.
      const focusScore = focusScoreFromResult(result) ?? Math.max(
        0,
        100 - (result.pauseCount ?? 0) - (result.inactivityCount ?? 0)
      );
      // eslint-disable-next-line no-await-in-loop -- sequential: each result must complete before the next
      await result.update({
        status: result.status,
        focusScore,
        completedAt: new Date(),
        exerciseState: null,
      });

      if (result.exerciseSessionId) {
        // eslint-disable-next-line no-await-in-loop -- sequential: session stats depend on prior result update
        await updateSessionStats(result.exerciseSessionId);
      }

      closed++;
      logger.info(`Auto-closed stale result ${result.id} → completed`);
    } catch (error) {
      errors++;
      logger.error('Failed to auto-close stale exercise result', {
        resultId: result.id,
        error: error.message,
      });
    }
  }

  logger.info(`Stale result cleanup complete: ${closed} closed, ${errors} errors.`);
  return { closed, errors };
};

module.exports = {
  closeStaleIncompleteResults,
};
