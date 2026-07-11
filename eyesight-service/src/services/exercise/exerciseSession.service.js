/**
 * Exercise Session Service
 * Handles session lifecycle management (start, complete, progress tracking).
 * Extracted from exercise.service.js for better separation of concerns.
 */

const httpStatus = require('http-status');
const { Op } = require('sequelize');
const moment = require('moment');
const { ExerciseSession, ExerciseAssignment, ExerciseConfig, Exercise, ExerciseResult } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { sequelize } = require('../../config/db');
const {
  isExerciseSlotEnded,
  computeSessionFocusScore,
} = require('../dashboard/leaderboardMetrics');
const { standardQuery } = require('../../utils/patterns');
const { generateCode } = require('../../utils/common');
const exerciseAssignmentService = require('./exerciseAssignment.service');

/**
 * Attach actual play-time bounds from ExerciseResults.
 * Session.startedAt is the cycle anchor (midnight) from the scheduler — not when the patient pressed Start.
 */
const enrichSessionsWithPlayTimes = async (sessions) => {
  if (!sessions?.length) {
    return sessions;
  }

  const sessionIds = sessions.map((session) => (session.toJSON ? session.id : session.id));
  const bounds = await ExerciseResult.findAll({
    attributes: [
      'exerciseSessionId',
      [sequelize.fn('MIN', sequelize.col('startedAt')), 'firstPlayedAt'],
      [sequelize.fn('MAX', sequelize.col('completedAt')), 'lastPlayedAt'],
    ],
    where: {
      exerciseSessionId: { [Op.in]: sessionIds },
      deleted: false,
    },
    group: ['exerciseSessionId'],
    raw: true,
  });

  const boundsBySessionId = new Map(bounds.map((row) => [row.exerciseSessionId, row]));

  return sessions.map((session) => {
    const json = session.toJSON ? session.toJSON() : { ...session };
    const playBounds = boundsBySessionId.get(json.id);
    return {
      ...json,
      firstPlayedAt: playBounds?.firstPlayedAt ?? null,
      lastPlayedAt: playBounds?.lastPlayedAt ?? json.completedAt ?? null,
    };
  });
};

/**
 * Recalculate session focusScore from ended results (fixes stale DB snapshots).
 * Uses the same rules as completeExercise / leaderboard (incl. idle inference).
 */
const enrichSessionsWithRecalculatedFocus = async (sessions) => {
  if (!sessions?.length) {
    return sessions;
  }

  const sessionIds = sessions.map((session) => (session.toJSON ? session.id : session.id));
  const results = await ExerciseResult.findAll({
    attributes: [
      'exerciseSessionId',
      'status',
      'duration',
      'movesCount',
      'pauseCount',
      'inactivityCount',
      'exerciseConfig',
    ],
    where: {
      exerciseSessionId: { [Op.in]: sessionIds },
      deleted: false,
    },
    raw: true,
  });

  const endedBySessionId = new Map();
  results.forEach((row) => {
    if (!isExerciseSlotEnded(row)) return;
    if (!endedBySessionId.has(row.exerciseSessionId)) {
      endedBySessionId.set(row.exerciseSessionId, []);
    }
    endedBySessionId.get(row.exerciseSessionId).push(row);
  });

  return sessions.map((session) => {
    const json = session.toJSON ? session.toJSON() : { ...session };
    const ended = endedBySessionId.get(json.id) || [];
    const { focusScore } = computeSessionFocusScore(ended);
    return { ...json, focusScore };
  });
};

/**
 * Start new exercise session
 */
const startExerciseSession = async (assignmentId, userId, deviceInfo = {}) => {
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }

  if (assignment.status !== 'active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Bài tập được giao không đang hoạt động');
  }

  // Check if already has session today (1 session per day max)
  const today = moment().startOf('day').toDate();
  const todayEnd = moment().endOf('day').toDate();

  const todaySessions = await ExerciseSession.count({
    where: {
      exerciseAssignmentId: assignmentId,
      startedAt: { [Op.between]: [today, todayEnd] },
    },
  });

  if (todaySessions >= 1) {
    return {
      success: false,
      reason: 'daily_session_exists',
      message: `Already have a session today. Only 1 session per day allowed.`,
    };
  }

  // Create new session with short code format
  const sessionCode = generateCode('SS'); // SS = Session
  const session = await ExerciseSession.create({
    code: sessionCode,
    exerciseAssignmentId: assignmentId,
    patientId: assignment.patientId,
    status: 'incomplete', // Database status: incomplete | completed
    startedAt: new Date(),
    centerId: assignment.centerId,
    deviceInfo,
    createdBy: userId,
    // Snapshot "số giao" lúc tạo buổi (P2)
    executionCount: assignment.exerciseConfig?.executionCount ?? null,
    executionDuration: assignment.exerciseConfig?.duration ?? null,
    // Snapshot dichoptic config at session start for reporting
    dichopticSnapshot: assignment.exerciseConfig?.dichoptic ?? null,
  });

  return {
    success: true,
    session,
    executionNumber: 1,
    totalExecutionsRequired: (assignment.exerciseConfig && assignment.exerciseConfig.executionCount) || 1,
  };
};

/**
 * Get session progress for assignment (executions within today's session)
 */
const getSessionProgress = async (assignmentId, date = new Date()) => {
  const startOfDay = moment(date).startOf('day').toDate();
  const endOfDay = moment(date).endOf('day').toDate();

  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);
  if (!assignment) return null;

  // Check if there's a session today
  const todaySession = await ExerciseSession.findOne({
    where: {
      exerciseAssignmentId: assignmentId,
      startedAt: { [Op.between]: [startOfDay, endOfDay] },
    },
  });

  if (!todaySession) {
    // No session today yet
    const requiredExecutions = assignment.exerciseConfig?.executionCount || 1;
    return {
      assignmentId,
      date: date.toISOString().split('T')[0],
      sessionExists: false,
      completed: 0,
      required: requiredExecutions,
      canStart: true,
      percentage: 0,
      isCompleted: false,
    };
  }

  const requiredExecutions = assignment.exerciseConfig?.executionCount || 1;
  const canStart = todaySession.status !== 'completed' && todaySession.executionsCompleted < requiredExecutions;

  // Calculate validity percentage
  const validityPercentage =
    todaySession.executionsCompleted > 0
      ? Math.round((todaySession.validExecutions / todaySession.executionsCompleted) * 100)
      : 0;

  // Check session completion based on 3 rules
  const isSessionComplete =
    todaySession.executionsCompleted >= requiredExecutions &&
    todaySession.validExecutions === todaySession.executionsCompleted &&
    todaySession.executionsCompleted > 0;

  return {
    assignmentId,
    date: date.toISOString().split('T')[0],
    sessionExists: true,
    sessionId: todaySession.id,
    sessionStatus: todaySession.status,
    completed: todaySession.executionsCompleted,
    validExecutions: todaySession.validExecutions,
    required: requiredExecutions,
    validityPercentage,
    canStart,
    percentage: Math.round((todaySession.executionsCompleted / requiredExecutions) * 100),
    isCompleted: isSessionComplete,
    totalScore: todaySession.totalScore,
    averageScore: todaySession.averageScore,
    bestScore: todaySession.bestScore,
  };
};

/**
 * Get weekly session summary
 */
const getWeeklyProgress = async (assignmentId, weekStart = new Date()) => {
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);
  if (!assignment) return null;

  // Get start of week (Monday)
  const startOfWeek = moment(weekStart).startOf('isoWeek').toDate();
  const endOfWeek = moment(weekStart).endOf('isoWeek').toDate();

  const sessions = await ExerciseSession.findAll({
    where: {
      exerciseAssignmentId: assignmentId,
      status: 'completed',
      startedAt: { [Op.between]: [startOfWeek, endOfWeek] },
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('startedAt')), 'date'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'sessions'],
    ],
    group: [sequelize.fn('DATE', sequelize.col('startedAt'))],
    raw: true,
  });

  const frequency = assignment.config?.frequency || 'daily';
  const requiredPerDay = assignment.config?.executionCount || 1;

  // Calculate weekly requirement based on frequency
  let weeklyRequired = 0;
  if (frequency === 'daily') {
    weeklyRequired = requiredPerDay * 7;
  } else if (frequency === 'weekly') {
    weeklyRequired = requiredPerDay;
  }

  const totalCompleted = sessions.reduce((sum, s) => sum + parseInt(s.sessions), 0);

  return {
    assignmentId,
    weekStart: startOfWeek.toISOString().split('T')[0],
    weekEnd: endOfWeek.toISOString().split('T')[0],
    frequency,
    dailySessions: sessions,
    totalCompleted,
    weeklyRequired,
    compliance: weeklyRequired > 0 ? Math.round((totalCompleted / weeklyRequired) * 100) : 0,
  };
};

/**
 * Get sessions for an assignment
 */
const getAssignmentSessions = async (filter = {}, options = {}) => {
  const includeConfig = [
    {
      model: ExerciseAssignment,
      as: 'exerciseAssignment',
      include: [
        {
          model: ExerciseConfig,
          as: 'exerciseConfig',
          attributes: ['executionCount', 'name', 'frequency', 'duration'],
          include: [
            {
              model: Exercise,
              as: 'exercise',
              attributes: ['id', 'name', 'code', 'exerciseType'],
            },
          ],
        },
      ],
    },
  ];

  const result = await standardQuery(ExerciseSession, filter, options, includeConfig);
  result.rows = await enrichSessionsWithPlayTimes(result.rows);
  return result;
};

/**
 * Get session results (executions within a session)
 */
const getSessionResults = async (filter = {}, options = {}) => {
  // Build where clause with date filters
  const where = { exerciseSessionId: filter.exerciseSessionId };

  // Date filters
  if (filter.startDate) {
    where.createdAt = { [Op.gte]: new Date(filter.startDate) };
  }
  if (filter.endDate) {
    const endDate = new Date(filter.endDate);
    endDate.setHours(23, 59, 59, 999);
    where.createdAt = {
      ...where.createdAt,
      [Op.lte]: endDate,
    };
  }

  const includeConfig = [
    {
      model: ExerciseSession,
      as: 'exerciseSession',
      attributes: ['id', 'code', 'status'],
      include: [
        {
          model: ExerciseAssignment,
          as: 'exerciseAssignment',
          include: [
            {
              model: ExerciseConfig,
              as: 'exerciseConfig',
              attributes: ['executionCount'],
              include: [
                {
                  model: Exercise,
                  as: 'exercise',
                  attributes: ['id', 'name', 'code', 'exerciseType'],
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  return standardQuery(ExerciseResult, where, options, includeConfig);
};

/**
 * Get session by ID
 */
const getSessionById = async (sessionId) => {
  const session = await ExerciseSession.findByPk(sessionId, {
    include: [
      {
        model: ExerciseAssignment,
        as: 'exerciseAssignment',
        attributes: ['id', 'patientId', 'centerId'],
      },
    ],
  });

  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phiên bài tập không tồn tại');
  }

  return session;
};

/**
 * Update session status directly
 */
const updateSessionStatus = async (sessionId, status) => {
  const session = await ExerciseSession.findByPk(sessionId);

  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phiên bài tập không tồn tại');
  }

  const updatedSession = await session.update({ status });
  return updatedSession;
};

/**
 * Get completed exercise sessions for a patient (used for progress charts).
 *
 * The chart reads everything it needs from the SESSION itself (snapshots):
 *   - averageScore                      → Chỉ số 1
 *   - duration / executionDuration / executionCount → Chỉ số 2
 *   - focusScore                        → Chỉ số 3
 *   - visionLevel                       → Chỉ số 4 (formatted via config.visionType)
 *
 * Config is included only for display metadata: visionType (format độ khó),
 * name + eye (nhãn assignment), frequency (nhãn trục X thích nghi).
 * No ExerciseResult include — session columns already hold the aggregates.
 */
const getPatientExerciseSessions = async (filter = {}, options = {}) => {
  const includeConfig = [
    {
      model: ExerciseAssignment,
      as: 'exerciseAssignment',
      include: [
        {
          model: ExerciseConfig,
          as: 'exerciseConfig',
          attributes: ['id', 'name', 'visionType', 'eye', 'frequency'],
        },
      ],
    },
  ];

  const result = await standardQuery(ExerciseSession, filter, options, includeConfig);
  if (result.rows?.length) {
    result.rows = await enrichSessionsWithRecalculatedFocus(result.rows);
  }
  return result;
};

module.exports = {
  startExerciseSession,
  getSessionProgress,
  getWeeklyProgress,
  getAssignmentSessions,
  getSessionResults,
  getSessionById,
  updateSessionStatus,
  getPatientExerciseSessions,
  enrichSessionsWithPlayTimes,
};
