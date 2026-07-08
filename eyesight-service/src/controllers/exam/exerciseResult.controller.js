const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const { exerciseResultService, exerciseSessionService, patientService } = require('../../services');

const filterKeys = ['code', 'score', 'status', 'centerId'];

// ============================================
// NEW CONTROLLERS: Start, Pause, Complete
// ============================================

/**
 * Start or resume an exercise
 * POST /me/assignments/:assignmentId/sessions/:sessionId/results
 */
const startExercise = catchAsync(async (req, res) => {
  const { assignmentId, sessionId } = req.params;

  // Get patient record for current user
  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const result = await exerciseResultService.startExercise(
    parseInt(sessionId, 10),
    parseInt(assignmentId, 10),
    patient.id, // Use patient.id (Patients.id)
    req.user.centerId,
    req.user.id // userId for createdBy
  );

  res.status(httpStatus.OK).send(result);
});

/**
 * Pause an exercise - save current game state
 * PATCH /me/assignments/:assignmentId/sessions/:sessionId/results/:resultId
 */
const pauseExercise = catchAsync(async (req, res) => {
  const { resultId } = req.params;

  // Verify ownership: get patient record for current user
  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const result = await exerciseResultService.pauseExercise(parseInt(resultId, 10), req.body, patient.id);

  res.status(httpStatus.OK).send(result);
});

/**
 * Track a 30-second inactivity event
 * POST /me/assignments/:assignmentId/sessions/:sessionId/results/:resultId/inactivity
 */
const trackInactivity = catchAsync(async (req, res) => {
  const { resultId } = req.params;

  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  await exerciseResultService.trackInactivity(parseInt(resultId, 10), patient.id);

  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Complete an exercise - evaluate pass/fail
 * POST /me/assignments/:assignmentId/sessions/:sessionId/results/:resultId/complete
 */
const completeExercise = catchAsync(async (req, res) => {
  const { resultId } = req.params;

  // Verify ownership: get patient record for current user
  const patient = await patientService.getPatientByUserId(req.user.id);
  if (!patient) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Patient record not found');
  }

  const result = await exerciseResultService.completeExercise(parseInt(resultId, 10), req.body, patient.id);

  res.status(httpStatus.OK).send(result);
});

// ============================================
// EXISTING CONTROLLERS
// ============================================

const createExerciseResult = catchAsync(async (req, res) => {
  const result = await exerciseResultService.createExerciseResult(req.body);
  res.status(httpStatus.CREATED).send(result);
});

const getExerciseResults = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // If patientId is in the URL params, we need to filter by patientId
  if (req.params.patientId) {
    filter.patientId = parseInt(req.params.patientId, 10);
    filter.status = 'completed';
  }

  const result = await exerciseResultService.queryExerciseResults(filter, options);
  res.send(result);
});

const getExerciseResult = catchAsync(async (req, res) => {
  const result = await exerciseResultService.getExerciseResultById(req.params.resultId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại');
  }

  // Check if result belongs to patient (if patientId in URL)
  if (req.params.patientId) {
    const patientId = parseInt(req.params.patientId, 10);
    if (result.patientId !== patientId) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại cho bệnh nhân này');
    }
  }

  res.send(result);
});

const updateExerciseResult = catchAsync(async (req, res) => {
  const result = await exerciseResultService.updateExerciseResultById(req.params.resultId, req.body);
  res.send(result);
});

const deleteExerciseResult = catchAsync(async (req, res) => {
  await exerciseResultService.deleteExerciseResultById(req.params.resultId);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteExerciseResults = catchAsync(async (req, res) => {
  await exerciseResultService.deleteExerciseResultByIds(req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get completed exercise sessions for a patient (admin/doctor view for progress chart)
 * GET /v1/patients/:patientId/exercise-sessions
 */
const getPatientExerciseSessions = catchAsync(async (req, res) => {
  const patientId = parseInt(req.params.patientId, 10);
  const filter = { patientId, status: 'completed' };
  const options = pick(req.query, ['sortBy', 'sortOrder', 'limit', 'page']);
  options.sortBy = options.sortBy || 'completedAt:asc';

  const result = await exerciseSessionService.getPatientExerciseSessions(filter, options);
  res.send(result);
});

module.exports = {
  // New controllers
  startExercise,
  pauseExercise,
  trackInactivity,
  completeExercise,
  // Existing controllers
  createExerciseResult,
  getExerciseResults,
  getExerciseResult,
  updateExerciseResult,
  deleteExerciseResult,
  deleteExerciseResults,
  getPatientExerciseSessions,
};
