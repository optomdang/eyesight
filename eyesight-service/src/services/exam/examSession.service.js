const { Op } = require('sequelize');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const { getCurrentCycleDateRange } = require('../../utils/common');
const { ExamSession, ExamResult, ExamMetric, Patient } = require('../../models');
const { sequelize } = require('../../config/db');
const examNotificationService = require('./examNotification.service');
const auditLogService = require('../system/auditLog.service');
const { recalculatePatientComplianceByType } = require('../clinic/compliance.service');
const { eyeObj, isFull } = require('../../utils/examResultsBackfill');
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
 * Reset a completed session so the patient can take the current-cycle exam again.
 * The result and metrics from this cycle are removed from normal clinical history,
 * while the session itself is reopened for a clean start.
 */
const resetExamSessionForRetake = async (sessionId, actor = {}) => {
  const session = await getExamSessionById(sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Phiên kiểm tra không tồn tại');
  }
  if (session.status !== 'completed') {
    throw new ApiError(httpStatus.CONFLICT, 'Chỉ có thể làm lại bài kiểm tra đã hoàn thành');
  }

  const resetResult = await sequelize.transaction(async (transaction) => {
    const activeResults = await ExamResult.findAll({
      where: { examSessionId: session.id, deleted: false },
      transaction,
    });
    const resultIds = activeResults.map((result) => result.id);

    if (resultIds.length > 0) {
      await ExamMetric.destroy({
        where: { examResultId: { [Op.in]: resultIds } },
        transaction,
      });
      await ExamResult.update(
        {
          deleted: true,
          deletedAt: new Date(),
          updatedBy: actor.userId || null,
        },
        {
          where: { id: { [Op.in]: resultIds } },
          transaction,
          hooks: false,
        }
      );
    }

    await ExamSession.update(
      {
        status: 'incomplete',
        startedAt: null,
        endedAt: null,
        completedAt: null,
        deviceInfo: null,
        updatedBy: actor.userId || null,
      },
      { where: { id: session.id }, transaction }
    );

    // Roll the denormalized patient cache back to the latest remaining result.
    const remainingResults = await ExamResult.findAll({
      where: {
        patientId: session.patientId,
        examType: session.examType,
        status: 'completed',
        deleted: false,
      },
      order: [
        ['completedAt', 'ASC'],
        ['createdAt', 'ASC'],
      ],
      transaction,
    });
    const completedResults = remainingResults.map((result) => result.get({ plain: true })).filter(isFull);
    const patient = await Patient.findByPk(session.patientId, { transaction });
    if (patient) {
      const examResults = { ...(patient.examResults || {}) };
      if (completedResults.length === 0) {
        delete examResults[session.examType];
      } else {
        const first = completedResults[0];
        const latest = completedResults[completedResults.length - 1];
        examResults[session.examType] = {
          initialResult: eyeObj(first),
          currentResult: eyeObj(latest),
          lastExamDate: latest.completedAt || latest.createdAt || null,
        };
      }
      await patient.update({ examResults }, { transaction });
    }

    return {
      sessionId: session.id,
      patientId: session.patientId,
      examType: session.examType,
      removedResultIds: resultIds,
    };
  });

  try {
    await recalculatePatientComplianceByType(session.patientId, session.examType);
  } catch (error) {
    logger.error('Failed to recalculate compliance after exam retake reset', {
      sessionId: session.id,
      patientId: session.patientId,
      examType: session.examType,
      error: error.message,
    });
  }
  await auditLogService.logEntityAuditEvent({
    action: 'examSession.resetForRetake',
    entityType: 'examSession',
    entityId: session.id,
    centerId: session.centerId,
    actorUserId: actor.userId || null,
    actorUserType: actor.userType || null,
    requestContext: actor.requestContext || {},
    metadata: {
      patientId: session.patientId,
      examType: session.examType,
      removedResultIds: resetResult.removedResultIds,
    },
  });

  return getExamSessionById(session.id);
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
  resetExamSessionForRetake,
  getPatientHistorySessions,
};
