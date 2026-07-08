const { Op } = require('sequelize');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { getCurrentCycleDateRange } = require('../../utils/common');
const { ExamSession, ExamResult } = require('../../models');
const { _sequelize } = require('../../config/db');
const examNotificationService = require('./examNotification.service');
const {
  standardQuery,
  standardCreate,
  standardSoftDelete,
  standardGetById,
  withTransaction,
} = require('../../utils/patterns');
const { ATTRS } = require('../../utils/query');

/**
 * Create a test session
 * @param {Object} sessionBody
 * @returns {Promise<ExamSession>}
 */
const createExamSession = async (sessionBody) => {
  // Enforce single examType per session (matching Exercise pattern)
  if (!sessionBody.examType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Loại kiểm tra là bắt buộc');
  }

  // Use transaction wrapper for complex operation
  return withTransaction(async (transaction) => {
    // Create the exam session using standardized pattern
    const examSession = await standardCreate(ExamSession, sessionBody, transaction);

    // NOTE: Do NOT pre-create ExamResult records.
    // ExamResult MUST be created via startExamFromSession/createMyExamResult with examSessionId.

    return examSession;
  });
};

/**
 * Query for test sessions with optimized includes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryExamSessions = async (filter, options) => {
  const includeConfig = [
    {
      model: ExamResult,
      as: 'examResults',
      attributes: ATTRS.EXAM_RESULT_BASIC, // Optimized attribute selection
      required: false,
    },
  ];

  return standardQuery(ExamSession, filter, options, includeConfig);
};

/**
 * Get test session by id with optimized includes
 * @param {number} id
 * @returns {Promise<ExamSession>}
 */
const getExamSessionById = async (id) => {
  const includeConfig = [
    {
      model: ExamResult,
      as: 'examResults',
      attributes: ATTRS.EXAM_RESULT_LIST, // Optimized attribute selection
    },
  ];

  return standardGetById(ExamSession, id, includeConfig);
};

/**
 * Update test session by id
 * @param {number} sessionId
 * @param {Object} updateBody
 * @returns {Promise<ExamSession>}
 */
const updateExamSessionById = async (sessionId, updateBody) => {
  const session = await getExamSessionById(sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phiên kiểm tra không tồn tại');
  }

  if (updateBody.code && updateBody.code !== session.code) {
    if (await ExamSession.isDuplicateCode(updateBody.code, session.centerId, sessionId)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Mã phiên kiểm tra đã tồn tại');
    }
  }

  Object.assign(session, updateBody);
  await session.save();

  // Send notifications based on status change
  // Note: 'incomplete' with startedAt indicates exam is in progress
  if (updateBody.status === 'incomplete' && updateBody.startedAt && !session.startedAt) {
    // Exam started
    try {
      await examNotificationService.sendExamStartNotification(sessionId);
    } catch (error) {
      // Log error but don't fail the update
      logger.error('Failed to send exam start notification', { error: error.message, sessionId });
    }
  } else if (updateBody.status === 'completed' && session.status !== 'completed') {
    // Exam completed
    try {
      await examNotificationService.sendExamCompleteNotification(sessionId);
    } catch (error) {
      // Log error but don't fail the update
      logger.error('Failed to send exam complete notification', { error: error.message, sessionId });
    }
  }

  return session;
};

/**
 * Delete test session by id
 * @param {number} sessionId
 * @returns {Promise<ExamSession>}
 */
const deleteExamSessionById = async (sessionId) => {
  return standardSoftDelete(ExamSession, sessionId, 'Phiên kiểm tra');
};

/**
 * Get patient history exam sessions (completed and expired in-progress sessions)
 * @param {number} patientId - The patient ID
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<Object>} - Object containing history exam sessions with pagination
 */
const getPatientHistorySessions = async (patientId, options = {}) => {
  if (!patientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID bệnh nhân là bắt buộc');
  }

  const filter = {
    patientId,
  };

  return standardQuery(ExamSession, filter, options);
};

/**
 * Get the session for the current calendar cycle (one per exam type) with optimized includes
 * Includes completed sessions so the portal can show "đã hoàn thành" in the current cycle.
 */
const getCurrentActiveSession = async (patientId, examType, frequency) => {
  const { start: cycleStart, end: cycleEnd } = getCurrentCycleDateRange(frequency, new Date());

  const session = await ExamSession.findOne({
    where: {
      patientId,
      examType,
      scheduledDate: {
        [Op.gte]: cycleStart,
        [Op.lte]: cycleEnd,
      },
      deleted: false,
    },
    order: [
      ['scheduledDate', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    include: [
      {
        model: ExamResult,
        as: 'examResults',
        attributes: ATTRS.EXAM_RESULT_BASIC, // Optimized attribute selection
        required: false,
      },
    ],
  });
  return session;
};

module.exports = {
  createExamSession,
  queryExamSessions,
  getExamSessionById,
  getCurrentActiveSession,
  updateExamSessionById,
  deleteExamSessionById,
  getPatientHistorySessions,
};
