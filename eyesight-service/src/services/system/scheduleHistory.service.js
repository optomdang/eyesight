/**
 * Schedule History Service
 * Log scheduler execution to ScheduleHistories table for audit
 */

const ScheduleHistory = require('../../models/system/scheduleHistory.model');
const logger = require('../../config/logger');

/**
 * Execute a job function and log its result to ScheduleHistory
 * @param {string} jobCode - Job code identifier (e.g., 'exam.createSessions')
 * @param {Function} jobFunction - Async function to execute
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Job execution result
 */
const executeAndLogJob = async (jobCode, jobFunction, options = {}) => {
  const startTime = Date.now();
  const ranAt = new Date();
  let status = 'success';
  let result = null;
  let error = null;

  try {
    result = await jobFunction();
  } catch (err) {
    status = 'failed';
    error = err.message || 'Job execution failed';
    logger.error(`Failed job: ${jobCode}`, err);
    throw err; // Re-throw to let scheduler handle it
  }

  const executionTime = Date.now() - startTime;

  // Save to ScheduleHistory
  try {
    await ScheduleHistory.create({
      jobCode,
      status,
      ranAt,
      executionTime,
      results: result ? { data: result } : null,
      error,
      triggeredBy: options.triggeredBy || 'cron',
      userId: options.userId || null,
      metadata: options.metadata || {},
    });
  } catch (historyError) {
    logger.error(`Failed to save job history for ${jobCode}:`, historyError);
  }

  return { jobCode, status, executionTime, result, error };
};

module.exports = {
  executeAndLogJob,
};
