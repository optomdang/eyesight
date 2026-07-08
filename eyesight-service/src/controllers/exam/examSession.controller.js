const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const examSessionService = require('../../services/exam/examSession.service');
const examAssignmentService = require('../../services/clinic/examAssignment.service');
const patientService = require('../../services/clinic/patient.service');

const filterKeys = ['code', 'patientId', 'doctorId', 'status', 'examType', 'scheduledDate', 'centerId'];

const createExamSession = catchAsync(async (req, res) => {
  const session = await examSessionService.createExamSession(req.body);
  res.status(httpStatus.CREATED).send(session);
});

const getExamSessions = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await examSessionService.queryExamSessions(filter, options);
  res.send(result);
});

const getExamSession = catchAsync(async (req, res) => {
  const session = await examSessionService.getExamSessionById(req.params.sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam session not found');
  }
  res.send(session);
});

const updateExamSession = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before updating
  const existingSession = await examSessionService.getExamSessionById(req.params.sessionId);
  if (!existingSession) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam session not found');
  }
  if (existingSession.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this exam session');
  }

  const session = await examSessionService.updateExamSessionById(req.params.sessionId, req.body);
  res.send(session);
});

const updateExamSessionStatus = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before updating
  const existingSession = await examSessionService.getExamSessionById(req.params.sessionId);
  if (!existingSession) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam session not found');
  }
  if (existingSession.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this exam session status');
  }

  const { status } = req.body;
  const session = await examSessionService.updateExamSessionById(req.params.sessionId, { status });
  res.send(session);
});

const deleteExamSession = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before deleting
  const existingSession = await examSessionService.getExamSessionById(req.params.sessionId);
  if (!existingSession) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam session not found');
  }
  if (existingSession.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this exam session');
  }

  await examSessionService.deleteExamSessionById(req.params.sessionId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getExamAssignmentSessionsStatus = catchAsync(async (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);
  const options = pick(req.query, ['historyLimit', 'historyPage']);
  const result = await examSessionService.getExamAssignmentSessionsStatus(patientId, options);
  res.send(result);
});

const getPatientHistorySessions = catchAsync(async (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await examSessionService.getPatientHistorySessions(patientId, options);
  res.send(result);
});

const getPatientCurrentSession = catchAsync(async (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);
  const result = await examSessionService.getPatientCurrentSession(patientId);
  res.send(result);
});

const getPatientUpcomingSession = catchAsync(async (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);
  const result = await examSessionService.getPatientUpcomingSession(patientId);
  res.send(result);
});

// === SCHEDULING FUNCTIONALITY ===

/**
 * Bulk endpoint to get exam dashboard data efficiently
 * Returns exam configs with computed status for each exam type
 */
const getExamAssignmentDashboard = catchAsync(async (req, res) => {
  const { patientId } = req.params;
  const examStatuses = await examAssignmentService.getDashboardData(patientId);
  res.send(examStatuses);
});

/**
 * Get exam sessions for a specific patient
 */
const getExamAssignmentSessions = catchAsync(async (req, res) => {
  const { patientId } = req.params;

  if (!patientId || Number.isNaN(parseInt(patientId, 10))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid patient ID');
  }

  const filter = { ...pick(req.query, filterKeys), patientId: parseInt(patientId, 10) };
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await examSessionService.queryExamSessions(filter, options);
  res.send(result);
});

/**
 * Get exam summary for current user's portal dashboard
 * Combines configs + recent sessions optimized for portal
 */
const getMyExamSummary = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID (same pattern as getMyExamResults)
  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  // Get configs and recent sessions in parallel for optimal performance
  const [examConfigs, recentSessions] = await Promise.all([
    examAssignmentService.getExamAssignments(patient.id),
    examSessionService.queryExamSessions({ patientId: patient.id }, { sortBy: 'createdAt:desc', limit: 100 }),
  ]);

  // Group sessions by examType for easier frontend processing
  // For sessions with examType=null, we need to group by individual exam results
  const sessionsByType = {};

  recentSessions.rows.forEach((session) => {
    if (session.examType) {
      // New style: session has specific examType
      if (!sessionsByType[session.examType]) {
        sessionsByType[session.examType] = [];
      }
      sessionsByType[session.examType].push(session);
    } else if (session.examResults && session.examResults.length > 0) {
      // Old style: session has multiple exam results, group by examResult.examType
      session.examResults.forEach((result) => {
        if (result.examType) {
          if (!sessionsByType[result.examType]) {
            sessionsByType[result.examType] = [];
          }
          // Create a virtual session for each exam type
          const virtualSession = {
            ...session.toJSON(),
            examType: result.examType,
            examResult: result,
            originalSessionId: session.id,
          };
          sessionsByType[result.examType].push(virtualSession);
        }
      });
    }
  });

  res.send({
    configs: examConfigs,
    sessionsByType,
    totalSessions: recentSessions.count,
  });
});

/**
 * Create exam session for current user (patient portal)
 */
const createMyExamSession = catchAsync(async (req, res) => {
  const patientId = req.user.id;

  // Get patient info to ensure they exist and get centerId
  const patient = req.user;
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  }

  // For single exam type, create session with specific examType
  const sessionData = {
    ...req.body,
    patientId,
    centerId: req.body.centerId || patient.centerId,
    code: req.body.code || `${req.body.examType.toUpperCase()}-${Date.now()}`,
    status: 'incomplete', // Database status (standardized)
    startedAt: req.body.startedAt || new Date(),
    createdBy: patientId,
    // IMPORTANT: Set examType on session for proper grouping
    examType: req.body.examType,
  };

  const session = await examSessionService.createExamSession(sessionData);
  res.status(httpStatus.CREATED).send(session);
});

module.exports = {
  createExamSession,
  getExamSessions,
  getExamSession,
  updateExamSession,
  updateExamSessionStatus,
  deleteExamSession,
  getExamAssignmentSessionsStatus,
  getPatientHistorySessions,
  getPatientCurrentSession,
  getPatientUpcomingSession,
  getExamAssignmentDashboard,
  getExamAssignmentSessions,
  getMyExamSummary,
  createMyExamSession,
};
