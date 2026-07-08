/**
 * Exercise Session Completion Service
 * Handles incrementing sessionsCompleted on assignment after a session is finished.
 * Extracted to avoid circular dependency between exerciseResult ↔ exerciseCompliance.
 */

const httpStatus = require('http-status');
const moment = require('moment');
const ApiError = require('../../utils/ApiError');
const { ExerciseAssignment, ExerciseConfig, Exercise } = require('../../models');

const calculateNextDueDate = (frequency, lastSessionDate = null) => {
  const baseDate = lastSessionDate || new Date();
  const nextDue = moment(baseDate);

  switch (frequency) {
    case 'daily':
      nextDue.add(1, 'day');
      break;
    case 'weekly':
      nextDue.add(7, 'days');
      break;
    case 'bi-weekly':
      nextDue.add(14, 'days');
      break;
    case 'monthly':
      nextDue.add(1, 'month');
      break;
    default:
      nextDue.add(1, 'day');
  }

  return nextDue.toDate();
};

/**
 * Increment sessionsCompleted and update compliance fields on an assignment.
 * Called after an ExerciseSession transitions to 'completed'.
 *
 * @param {number} assignmentId
 * @param {{ completedAt?: Date }} sessionData
 * @returns {Promise<ExerciseAssignment>}
 */
const recordSessionCompletion = async (assignmentId, sessionData = {}) => {
  const assignment = await ExerciseAssignment.findByPk(assignmentId, {
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
        include: [{ model: Exercise, as: 'exercise' }],
      },
    ],
  });

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  const config = assignment.exerciseConfig;
  const completedAt = sessionData.completedAt || new Date();

  const updatedData = {
    sessionsCompleted: assignment.sessionsCompleted + 1,
    lastSessionAt: completedAt,
    notificationCount: 0,
  };

  if (config && config.frequency) {
    updatedData.nextDueDate = calculateNextDueDate(config.frequency, completedAt);
    updatedData.complianceStatus = 'on_track';
  }

  await assignment.update(updatedData);
  return assignment;
};

module.exports = { recordSessionCompletion };
