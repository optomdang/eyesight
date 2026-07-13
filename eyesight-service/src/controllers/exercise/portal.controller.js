const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
// Op handled by services
// Sequelize handled by services
const {
  exerciseAssignmentService,
  exerciseSessionService,
  exerciseResultService,
  patientService,
  treatmentPackageService,
} = require('../../services');
const dashboardUserService = require('../../services/dashboard/dashboardUser.service');
// ExerciseSession handled by exerciseSessionService
// Models handled by services

const filterKeys = ['exerciseId', 'status', 'complianceStatus'];

// ===========================================
// PATIENT EXERCISE ASSIGNMENTS API
// ===========================================

/**
 * Get patient's exercise assignments with frequency tracking
 */
const getMyAssignments = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  // Apply treatment package filter at query level so pagination count is accurate.
  // Expand allowed IDs to include doctor/patient clones (configReferentId → template),
  // otherwise customized configs would silently disappear from the patient's list.
  const activePackage = await treatmentPackageService.getActivePatientPackage(patient.id);
  let packageFilter = {};
  if (activePackage && activePackage.allowedConfigIds?.length) {
    const allowedConfigIds = await treatmentPackageService.expandAllowedConfigIds(
      activePackage.allowedConfigIds,
      { centerId: patient.centerId }
    );
    packageFilter = { exerciseConfigId: allowedConfigIds };
  }

  const filter = {
    patientId: patient.id,
    status: 'active',
    ...packageFilter,
    ...pick(req.query, filterKeys),
  };
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await exerciseAssignmentService.getPatientAssignments(filter, options);

  res.send(result);
});

/**
 * Get patient's exercise sessions with status filter
 * Used for patient portal to show active/pending sessions
 */
const getMyExerciseSessions = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const filter = {
    patientId: patient.id,
    status: req.query.status || 'incomplete', // Default to incomplete sessions
  };
  const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
  const result = await exerciseAssignmentService.getPatientSessions(filter, options);

  res.send(result);
});

/**
 * Get specific assignment with today's progress
 */
const getMyAssignment = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const assignmentId = parseInt(req.params.assignmentId, 10);
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);

  if (!assignment || assignment.patientId !== patient.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Get today's session progress using service
  const todayProgress = await exerciseSessionService.getSessionProgress(assignmentId);

  res.send({
    ...assignment.toJSON(),
    todayProgress,
  });
});

/**
 * Start new exercise session
 */
const startAssignmentSession = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const assignmentId = parseInt(req.params.assignmentId, 10);
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);

  if (!assignment || assignment.patientId !== patient.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  const configAllowed = await treatmentPackageService.isExerciseConfigAccessibleForPatient(
    patient.id,
    assignment.exerciseConfigId
  );
  if (!configAllowed) {
    return res.send({
      canStart: false,
      reason: 'package_restricted',
      message: 'Gói điều trị đã hết hạn hoặc chế độ tập này không nằm trong gói của bạn',
    });
  }

  // Start session using service
  const sessionResult = await exerciseSessionService.startExerciseSession(assignmentId, req.user.id, req.body.deviceInfo);

  if (!sessionResult.success) {
    return res.send({
      canStart: false,
      reason: sessionResult.reason,
      message: sessionResult.message,
    });
  }

  res.status(httpStatus.CREATED).send({
    canStart: true,
    sessionId: sessionResult.session.id,
    sessionCode: sessionResult.session.code,
    assignment,
    executionNumber: sessionResult.executionNumber,
    totalExecutionsRequired: sessionResult.totalExecutionsRequired,
  });
});

/**
 * Complete exercise session and submit results (with sessionId in path)
 */
const submitMyExerciseResult = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  req.body.patientId = patient.id;

  // Create exercise result with session statistics update
  const result = await exerciseResultService.createExerciseResult(req.body);

  res.status(httpStatus.CREATED).send(result);
});

/**
 * Get all exercise results for current user
 */
const getAllMyExerciseResults = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const filter = {
    patientId: patient.id,
    status: 'completed',
  };

  // Date filters
  if (req.query.startDate) filter.createdAtStart = new Date(req.query.startDate);
  if (req.query.endDate) filter.createdAtEnd = new Date(req.query.endDate);

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  options.sortBy = options.sortBy || 'createdAt:desc';

  const results = await exerciseResultService.queryExerciseResults(filter, options);
  res.send(results);
});

/**
 * Get session results history (executions within a specific session)
 */
const getMyExerciseResults = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const assignmentId = parseInt(req.params.assignmentId, 10);
  const sessionId = parseInt(req.params.sessionId, 10);

  const filter = {
    patientId: patient.id,
    exerciseAssignmentId: assignmentId,
    status: 'completed',
  };

  // Only filter by sessionId if provided in URL
  if (sessionId && !Number.isNaN(sessionId)) {
    filter.exerciseSessionId = sessionId;
  }

  // Date filters
  if (req.query.startDate) filter.createdAtStart = new Date(req.query.startDate);
  if (req.query.endDate) filter.createdAtEnd = new Date(req.query.endDate);

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  options.sortBy = options.sortBy || 'createdAt:desc';

  const results = await exerciseResultService.queryExerciseResults(filter, options);
  res.send(results);
});

/**
 * Get assignment statistics (frequency overview + progress summary)
 */
const getMyAssignmentStats = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  const assignments = await exerciseAssignmentService.getPatientAssignments({ patientId: patient.id });

  // Date filter for results
  const dateFilter = {};
  if (req.query.startDate) dateFilter.startDate = new Date(req.query.startDate);
  if (req.query.endDate) dateFilter.endDate = new Date(req.query.endDate);

  // Get exercise results summary
  const exerciseResults = await exerciseResultService.getResultsSummaryByPatient(patient.id, dateFilter);

  // Build assignment overview with today's progress (parallel processing)
  const assignmentOverview = await Promise.all(
    (assignments.rows || []).map(async (assignment) => {
      const progress = await exerciseSessionService.getSessionProgress(assignment.id);
      const config = assignment.exerciseConfig;
      const exercise = config && config.exercise;
      const currentSessionId = progress?.canStart ? progress.sessionId || assignment.currentSession?.id || null : null;

      return {
        assignmentId: assignment.id,
        exerciseName: exercise && exercise.name,
        frequency: config && config.frequency,
        todayCompleted: (progress && progress.completed) || 0,
        todayRequired: (progress && progress.required) || 1,
        isCompleted: (progress && progress.isCompleted) || false,
        complianceStatus: assignment.complianceStatus,
        currentSessionId,
      };
    })
  );

  // Combined response
  res.send({
    // Today's overview
    assignments: assignmentOverview,

    // Overall statistics
    summary: {
      totalAssignments: assignments.count || 0,
      activeAssignments: (assignments.rows && assignments.rows.filter((a) => a.status === 'active').length) || 0,
      totalSessions: exerciseResults.totalSessions || 0,
      averageScore: exerciseResults.averageScore || 0,
      totalTime: exerciseResults.totalTime || 0,
      complianceOverview: {
        compliant: (assignments.rows && assignments.rows.filter((a) => a.complianceStatus === 'compliant').length) || 0,
        overdue: (assignments.rows && assignments.rows.filter((a) => a.complianceStatus === 'overdue').length) || 0,
        critical: (assignments.rows && assignments.rows.filter((a) => a.complianceStatus === 'critical').length) || 0,
      },
    },
  });
});

/**
 * Get assignment sessions history
 * GET /v1/me/assignments/:assignmentId/sessions
 */
const getMyAssignmentSessions = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const assignmentId = parseInt(req.params.assignmentId, 10);
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);

  if (!assignment || assignment.patientId !== patient.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // Use service to get sessions
  const filter = {
    exerciseAssignmentId: assignmentId,
    patientId: patient.id,
  };

  // Only add date filters if they exist
  if (req.query.startDate) {
    filter.startDate = req.query.startDate;
  }
  if (req.query.endDate) {
    filter.endDate = req.query.endDate;
  }

  const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);

  const result = await exerciseSessionService.getAssignmentSessions(filter, options);

  res.send(result);
});

/**
 * Get current patient's completed exercise sessions (for progress chart)
 * GET /v1/me/exercise-sessions/history
 */
const getMyExerciseSessionsHistory = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const filter = { patientId: patient.id, status: 'completed' };
  const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
  options.sortBy = options.sortBy || 'completedAt:asc';

  const result = await exerciseSessionService.getPatientExerciseSessions(filter, options);
  res.send(result);
});

/**
 * BẢNG XẾP HẠNG (portal) — dùng LẠI nguyên xi getLeaderboard của admin, chỉ đổi nguồn
 * centerId: lấy từ center của bệnh nhân hiện tại (thay vì center của nhân viên).
 * Trả về mảng top-performers y hệt admin để FE tái dùng component TopPerformersLeaderboard.
 */
const getMyLeaderboard = catchAsync(async (req, res) => {
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const topPerformers = await dashboardUserService.getLeaderboard(patient.centerId);
  res.send({ topPerformers });
});

module.exports = {
  getMyAssignments,
  getMyExerciseSessions,
  getMyAssignment,
  startAssignmentSession,
  submitMyExerciseResult,
  getAllMyExerciseResults,
  getMyExerciseResults,
  getMyAssignmentStats,
  getMyAssignmentSessions,
  getMyExerciseSessionsHistory,
  getMyLeaderboard,
};
