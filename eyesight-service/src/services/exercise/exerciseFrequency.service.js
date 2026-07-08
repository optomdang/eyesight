const httpStatus = require('http-status');
const moment = require('moment');
const { ExerciseResult, ExerciseAssignment } = require('../../models');
const ApiError = require('../../utils/ApiError');

/**
 * Calculate frequency period identifier based on frequency type and date
 * @param {string} frequency - 'daily', 'weekly', 'monthly'
 * @param {Date} date - Date to calculate period for
 * @returns {string} Period identifier
 */
const calculateFrequencyPeriod = (frequency, date = new Date()) => {
  const momentDate = moment(date);

  switch (frequency) {
    case 'daily':
      return momentDate.format('YYYY-MM-DD');
    case 'weekly':
      // Week starting Monday
      return momentDate.startOf('week').format('YYYY-MM-DD');
    case 'monthly':
      return momentDate.format('YYYY-MM');
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
};

/**
 * Get current session count for a frequency period
 * @param {number} exerciseAssignmentId
 * @param {string} frequencyPeriod
 * @returns {Promise<number>} Current session count
 */
const getCurrentSessionCount = async (exerciseAssignmentId, frequencyPeriod) => {
  const count = await ExerciseResult.count({
    where: {
      exerciseAssignmentId,
      frequencyPeriod,
      completed: true, // Only count completed sessions
      deleted: false,
    },
  });

  return count;
};

/**
 * Check if frequency period is completed
 * @param {number} exerciseAssignmentId
 * @param {string} frequencyPeriod
 * @returns {Promise<{completed: boolean, currentCount: number, requiredCount: number}>}
 */
const checkFrequencyPeriodStatus = async (exerciseAssignmentId, frequencyPeriod) => {
  const assignment = await ExerciseAssignment.findByPk(exerciseAssignmentId, {
    include: [{ model: require('../exercise/exerciseConfig.model'), as: 'config' }],
  });

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  const requiredCount = assignment.config.executionCount || 1;
  const currentCount = await getCurrentSessionCount(exerciseAssignmentId, frequencyPeriod);

  return {
    completed: currentCount >= requiredCount,
    currentCount,
    requiredCount,
    assignment,
  };
};

/**
 * Calculate next session number for frequency period
 * @param {number} exerciseAssignmentId
 * @param {string} frequencyPeriod
 * @returns {Promise<number>} Next session number
 */
const getNextSessionNumber = async (exerciseAssignmentId, frequencyPeriod) => {
  const currentCount = await getCurrentSessionCount(exerciseAssignmentId, frequencyPeriod);
  return currentCount + 1;
};

/**
 * Record exercise session with frequency tracking
 * @param {Object} sessionData - Exercise result data
 * @param {number} exerciseAssignmentId - Assignment ID
 * @returns {Promise<ExerciseResult>}
 */
const recordFrequencySession = async (sessionData, exerciseAssignmentId) => {
  const assignment = await ExerciseAssignment.findByPk(exerciseAssignmentId, {
    include: [{ model: require('../exercise/exerciseConfig.model'), as: 'config' }],
  });

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  const { frequency } = assignment.config;
  const frequencyPeriod = calculateFrequencyPeriod(frequency);
  const sessionNumber = await getNextSessionNumber(exerciseAssignmentId, frequencyPeriod);

  // Check if this session will complete the period
  const periodStatus = await checkFrequencyPeriodStatus(exerciseAssignmentId, frequencyPeriod);
  const willCompletePeriod = sessionNumber >= periodStatus.requiredCount && sessionData.completed;

  // Create exercise result with frequency tracking
  const result = await ExerciseResult.create({
    ...sessionData,
    exerciseAssignmentId,
    frequencyPeriod,
    sessionNumber,
    periodCompleted: willCompletePeriod,
  });

  // Update assignment compliance if period is completed
  if (willCompletePeriod) {
    await updateAssignmentAfterPeriodCompletion(assignment, frequencyPeriod);
  }

  return result;
};

/**
 * Update assignment after frequency period completion
 * @param {ExerciseAssignment} assignment
 * @param {string} _completedPeriod
 */
const updateAssignmentAfterPeriodCompletion = async (assignment, _completedPeriod) => {
  const { frequency } = assignment.config;
  const nextDueDate = calculateNextDueDate(frequency, new Date());

  await assignment.update({
    nextDueDate,
    complianceStatus: 'compliant',
    notificationCount: 0, // Reset notification counter
  });
};

/**
 * Calculate next due date based on frequency
 * @param {string} frequency
 * @param {Date} fromDate
 * @returns {Date}
 */
const calculateNextDueDate = (frequency, fromDate = new Date()) => {
  const momentDate = moment(fromDate);

  switch (frequency) {
    case 'daily':
      return momentDate.add(1, 'day').toDate();
    case 'weekly':
      return momentDate.add(1, 'week').startOf('week').toDate();
    case 'monthly':
      return momentDate.add(1, 'month').startOf('month').toDate();
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
};

/**
 * Get frequency period progress for patient
 * @param {number} exerciseAssignmentId
 * @param {Date} date
 * @returns {Promise<Object>}
 */
const getFrequencyProgress = async (exerciseAssignmentId, date = new Date()) => {
  const assignment = await ExerciseAssignment.findByPk(exerciseAssignmentId, {
    include: [{ model: require('../exercise/exerciseConfig.model'), as: 'config' }],
  });

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  const { frequency } = assignment.config;
  const frequencyPeriod = calculateFrequencyPeriod(frequency, date);
  const status = await checkFrequencyPeriodStatus(exerciseAssignmentId, frequencyPeriod);

  return {
    assignmentId: exerciseAssignmentId,
    frequency,
    frequencyPeriod,
    currentSessions: status.currentCount,
    requiredSessions: status.requiredCount,
    completed: status.completed,
    progress: Math.round((status.currentCount / status.requiredCount) * 100),
    nextDueDate: assignment.nextDueDate,
    complianceStatus: assignment.complianceStatus,
  };
};

/**
 * Get patient's frequency progress for all assignments
 * @param {number} patientId
 * @param {Date} date
 * @returns {Promise<Object[]>}
 */
const getPatientFrequencyOverview = async (patientId, date = new Date()) => {
  const assignments = await ExerciseAssignment.findAll({
    where: { patientId, status: 'active' },
    include: [
      { model: require('../exercise/exerciseConfig.model'), as: 'config' },
      { model: require('../clinic/exercise.model'), as: 'exercise' },
    ],
  });

  const overviewPromises = assignments.map(async (assignment) => {
    const progress = await getFrequencyProgress(assignment.id, date);
    return {
      ...progress,
      exerciseName: assignment.exercise.name,
      exerciseType: assignment.exercise.type,
    };
  });

  const overview = await Promise.all(overviewPromises);
  return overview;
};

module.exports = {
  calculateFrequencyPeriod,
  getCurrentSessionCount,
  checkFrequencyPeriodStatus,
  getNextSessionNumber,
  recordFrequencySession,
  updateAssignmentAfterPeriodCompletion,
  calculateNextDueDate,
  getFrequencyProgress,
  getPatientFrequencyOverview,
};
