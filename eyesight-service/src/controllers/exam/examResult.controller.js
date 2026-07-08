const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { generateCode } = require('../../utils/common');
const { provisionExamSession } = require('../../utils/sessionProvisionUtils');
const { examResultService, patientService, examSessionService } = require('../../services');
const examAssignmentService = require('../../services/clinic/examAssignment.service');

/**
 * Create exam result for current user (patient portal)
 * MATCHING Exercise pattern: require sessionId
 */
const createMyExamResult = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID
  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  // REQUIRE examSessionId (matching Exercise pattern)
  const { examSessionId } = req.body;
  if (!examSessionId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'examSessionId is required');
  }

  // Validate session exists
  const session = await examSessionService.getExamSessionById(examSessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam session not found');
  }

  // Validate session belongs to patient
  if (session.patientId !== patient.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'This exam session does not belong to you');
  }

  // Validate session not already completed
  if (session.status === 'completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Session already completed. Please use a different session.');
  }

  // Validate exam type matches session
  if (req.body.examType && req.body.examType !== session.examType) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Exam type does not match session exam type');
  }

  // Check if there's already an incomplete exam of this type (additional safety check)
  const existingIncomplete = await examResultService.getIncompleteExamResult(patient.id, session.examType);
  if (existingIncomplete) {
    throw new ApiError(httpStatus.CONFLICT, 'There is already an incomplete exam of this type');
  }

  // Create exam result
  const examResultData = {
    ...req.body,
    examSessionId: session.id,
    examType: session.examType, // Use examType from session
    patientId: patient.id,
    centerId: patient.centerId,
    status: 'incomplete',
    startedAt: new Date(),
    code: generateCode('ER'),
  };

  const examResult = await examResultService.createExamResult(examResultData);

  // Update session status (session remains incomplete until exam is completed)
  await examSessionService.updateExamSessionById(session.id, {
    startedAt: new Date(),
  });

  res.status(httpStatus.CREATED).send(examResult);
});

/**
 * Get my exam results
 */
const getMyExamResults = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID
  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const filter = pick(req.query, ['examType', 'status', 'examSessionId']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Add patient filter and centerId (required for multi-tenant isolation)
  filter.patientId = patient.id;
  filter.centerId = patient.centerId;

  // Default sort by completion date desc for history consistency.
  // This keeps recently completed exams (including long-running incomplete->completed flows)
  // visible at the top of history.
  if (!options.sortBy) {
    options.sortBy = 'completedAt:desc';
  }

  const result = await examResultService.queryExamResults(filter, options);
  res.send(result);
});

/**
 * Update my exam result
 * MATCHING Exercise pattern: auto-update session status
 */
const updateMyExamResult = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID
  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const examResult = await examResultService.getExamResultById(req.params.examResultId);
  if (!examResult) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam result not found');
  }

  // Verify ownership
  if (examResult.patientId !== patient.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }

  // Auto-set completedAt if status is being changed to completed
  const updateData = { ...req.body };
  if (updateData.status === 'completed' && examResult.status !== 'completed') {
    updateData.completedAt = new Date();

    // Update session status to completed (matching Exercise pattern)
    if (examResult.examSessionId) {
      await examSessionService.updateExamSessionById(examResult.examSessionId, {
        status: 'completed',
        completedAt: new Date(),
        endedAt: new Date(),
      });
    }
  }

  const updatedExamResult = await examResultService.updateExamResultById(req.params.examResultId, updateData);
  res.send(updatedExamResult);
});

/**
 * Get my exam dashboard (simplified)
 */
const getMyExamDashboard = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID
  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  // Get configs, completed results, and incomplete results in parallel.
  // queryExamResults enforces multi-tenant isolation → centerId is REQUIRED in the filter.
  const [examConfigs, completedResults, incompleteResults] = await Promise.all([
    examAssignmentService.getExamAssignments(patient.id),
    examResultService.queryExamResults(
      { patientId: patient.id, centerId: patient.centerId, status: 'completed' }, // Only completed exams for date calculation
      { sortBy: 'completedAt:desc', limit: 100 } // Sort by completion date
    ),
    examResultService.queryExamResults(
      { patientId: patient.id, centerId: patient.centerId, status: 'incomplete' }, // Incomplete exams for status
      { sortBy: 'createdAt:desc', limit: 10 }
    ),
  ]);

  // Group completed results by examType for date calculation
  const completedResultsByType = {};
  completedResults.rows.forEach((result) => {
    if (!completedResultsByType[result.examType]) {
      completedResultsByType[result.examType] = [];
    }
    completedResultsByType[result.examType].push(result);
  });

  // Group incomplete results by examType for status
  const incompleteResultsByType = {};
  incompleteResults.rows.forEach((result) => {
    if (!incompleteResultsByType[result.examType]) {
      incompleteResultsByType[result.examType] = [];
    }
    incompleteResultsByType[result.examType].push(result);
  });

  res.send({
    configs: examConfigs,
    completedResultsByType,
    incompleteResultsByType,
    totalCompletedResults: completedResults.count,
    totalIncompleteResults: incompleteResults.count,
  });
});

/**
 * Get patient exam results (admin use)
 */
const getExamAssignmentResults = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['examType', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Add patient filter
  filter.patientId = req.params.patientId;
  // SECURITY: Add centerId filtering
  filter.centerId = req.user.centerId;

  // Default sort by created date desc
  if (!options.sortBy) {
    options.sortBy = 'createdAt:desc';
  }

  const result = await examResultService.queryExamResults(filter, options);
  res.send(result);
});

/**
 * Create exam result (admin use)
 */
const createExamResult = catchAsync(async (req, res) => {
  const examResult = await examResultService.createExamResult(req.body);
  res.status(httpStatus.CREATED).send(examResult);
});

/**
 * Get latest patient exam result (admin use)
 */
const getLatestExamAssignmentResult = catchAsync(async (req, res) => {
  const latestResult = await examResultService.getLatestExamResultByPatientId(req.params.patientId);
  if (!latestResult) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No exam results found for this patient');
  }
  res.send(latestResult);
});

/**
 * Get exam result by ID (admin use)
 */
const getExamResult = catchAsync(async (req, res) => {
  const examResult = await examResultService.getExamResultById(req.params.resultId);
  if (!examResult) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam result not found');
  }
  // SECURITY: Verify center ownership
  if (examResult.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this exam result');
  }
  res.send(examResult);
});

/**
 * Update exam result by ID (admin use)
 */
const updateExamResult = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before updating
  const examResult = await examResultService.getExamResultById(req.params.resultId);
  if (!examResult) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam result not found');
  }
  if (examResult.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this exam result');
  }

  const updatedResult = await examResultService.updateExamResultById(req.params.resultId, req.body);
  res.send(updatedResult);
});

/**
 * Delete exam result by ID (admin use)
 */
const deleteExamResult = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before deleting
  const examResult = await examResultService.getExamResultById(req.params.resultId);
  if (!examResult) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam result not found');
  }
  if (examResult.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this exam result');
  }

  await examResultService.deleteExamResultById(req.params.resultId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get exam results by exam session ID (admin use)
 */
const getExamResultsByExamSessionId = catchAsync(async (req, res) => {
  const examResults = await examResultService.getExamResultsByExamSessionId(req.params.sessionId);
  res.send(examResults);
});

/**
 * Get exam results (admin use)
 */
const getExamResults = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['examType', 'status', 'patientId', 'centerId']);
  if (filter.sessionId) {
    filter.sessionId = req.params.sessionId;
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await examResultService.queryExamResults(filter, options);
  res.send(result);
});

/**
 * Delete multiple exam results (admin use)
 */
const deleteExamResults = catchAsync(async (req, res) => {
  await examResultService.deleteExamResultByIds(req.body.ids);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get my exam sessions (patient portal)
 * MATCHING Exercise pattern: GET /me/exam-sessions
 */
const getMyExamSessions = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID
  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const filter = pick(req.query, ['examType', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Add patient filter
  filter.patientId = patient.id;
  filter.deleted = false;

  // Default sort by scheduled date desc
  if (!options.sortBy) {
    options.sortBy = 'scheduledDate:desc';
  }

  const result = await examSessionService.queryExamSessions(filter, options);
  res.send(result);
});

/**
 * Get single exam session by ID (patient portal)
 * MATCHING Exercise pattern: GET /me/exam-sessions/:sessionId
 */
const getMyExamSession = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID
  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const session = await examSessionService.getExamSessionById(req.params.sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam session not found');
  }

  // Verify ownership
  if (session.patientId !== patient.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }

  res.send(session);
});

/**
 * Get current active sessions for patient (one per exam type)
 * GET /me/exam-sessions/current
 */
const getMyCurrentSessions = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  // Get exam types from ExamAssignment config
  const examAssignments = await examAssignmentService.getExamAssignments(patient.id);
  const enabledExamAssignments = (examAssignments || []).filter((examAssignment) => examAssignment?.isEnabled);

  if (enabledExamAssignments.length === 0) {
    // Return empty if no exam config
    res.send({});
    return;
  }

  // Ensure current-cycle exam sessions exist (cron may not have run in dev / after downtime)
  await Promise.all(enabledExamAssignments.map((examAssignment) => provisionExamSession(examAssignment)));

  // Get sessions for each configured exam type (current calendar cycle)
  const sessions = await Promise.all(
    enabledExamAssignments.map(async (examAssignment) => {
      const session = await examSessionService.getCurrentActiveSession(
        patient.id,
        examAssignment.examType,
        examAssignment.frequency
      );
      if (!session) return null;

      return {
        examType: examAssignment.examType,
        session: {
          ...session.get({ plain: true }),
          frequency: examAssignment.frequency,
        },
      };
    })
  );

  // Filter out null values and return as object keyed by examType
  const result = sessions
    .filter((s) => s !== null)
    .reduce((acc, item) => {
      acc[item.examType] = item.session;
      return acc;
    }, {});

  res.send(result);
});

/**
 * Start exam from session (patient portal)
 * MATCHING Exercise pattern: POST /me/exam-sessions/:sessionId/start
 * Creates ExamResult from session
 */
const startExamFromSession = catchAsync(async (req, res) => {
  const userId = parseInt(req.user.id, 10);
  if (Number.isNaN(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid user ID');
  }

  // Get patient record by user ID
  const patient = await patientService.getPatientByUserId(userId);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const sessionId = parseInt(req.params.sessionId, 10);
  const session = await examSessionService.getExamSessionById(sessionId);
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam session not found');
  }

  // Verify ownership
  if (session.patientId !== patient.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'This exam session does not belong to you');
  }

  // Validate session not already completed
  if (session.status === 'completed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Session already completed');
  }

  // Create exam result automatically
  const examResultData = {
    examSessionId: session.id,
    examType: session.examType,
    patientId: patient.id,
    centerId: patient.centerId,
    status: 'incomplete',
    startedAt: new Date(),
    code: generateCode('ER'),
  };

  const examResult = await examResultService.createExamResult(examResultData);

  // Update session startedAt (session remains incomplete until exam is completed)
  await examSessionService.updateExamSessionById(session.id, {
    startedAt: new Date(),
  });

  res.status(httpStatus.CREATED).send(examResult);
});

module.exports = {
  createMyExamResult,
  getMyExamResults,
  updateMyExamResult,
  getMyExamDashboard,
  getMyExamSessions,
  getMyExamSession,
  getMyCurrentSessions,
  startExamFromSession,
  getExamAssignmentResults,
  createExamResult,
  getLatestExamAssignmentResult,
  getExamResult,
  updateExamResult,
  deleteExamResult,
  getExamResultsByExamSessionId,
  getExamResults,
  deleteExamResults,
};
