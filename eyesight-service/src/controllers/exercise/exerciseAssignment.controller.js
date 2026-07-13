const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const pick = require('../../utils/pick');
const { exerciseAssignmentService } = require('../../services');

/**
 * Assign exercise config to multiple patients
 * POST /exercise-assignments/exercise-configs/:configId/assignments
 */
const assignConfigToPatients = catchAsync(async (req, res) => {
  const { configId } = req.params;
  const { patientIds, notes, visionLevel, levelOverride, trainingEye, priority } = req.body;
  const { user } = req;

  if (!Array.isArray(patientIds)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'PatientIds array is required');
  }

  const assignmentData = {
    assignedBy: user.id,
    notes: notes || '',
    priority: priority || 'normal',
    visionLevel: visionLevel || null,
    levelOverride: levelOverride || false,
    trainingEye: trainingEye || null,
  };

  const assignments = await exerciseAssignmentService.assignConfigToPatients(
    configId,
    patientIds,
    assignmentData,
    user.centerId
  );

  res.status(httpStatus.CREATED).json({
    message: `Exercise config assignments synced for ${patientIds.length} patients`,
    data: assignments,
  });
});

/**
 * Get all assignments for a specific config
 * GET /exercise-configs/:exerciseConfigId/assignments
 */
const getConfigAssignments = catchAsync(async (req, res) => {
  const { exerciseConfigId } = req.params;
  const { user } = req;
  const filter = pick(req.query, ['status', 'startDate', 'endDate']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const assignments = await exerciseAssignmentService.getConfigAssignments(exerciseConfigId, user.centerId, filter, options);

  res.send(assignments);
});

/**
 * Get all assigned configs for a specific patient
 * GET /patients/:patientId/exercise-configs
 */
const getPatientAssignments = catchAsync(async (req, res) => {
  const { patientId } = req.params;
  const { user } = req;
  const filter = pick(req.query, ['status', 'exerciseType', 'assignedBy']);
  filter.patientId = patientId;
  // SECURITY: Add centerId filtering
  filter.centerId = user.centerId;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const assignments = await exerciseAssignmentService.getPatientAssignments(filter, options);

  res.send(assignments);
});

/**
 * Get single assignment by ID
 * GET /patients/:patientId/assignments/:assignmentId
 */
const getAssignment = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const { user } = req;
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);

  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }

  // SECURITY: Verify center ownership
  if (assignment.centerId !== user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this assignment');
  }

  res.json({
    message: 'Assignment retrieved successfully',
    data: assignment,
  });
});

/**
 * Update assignment status
 * PATCH /patients/:patientId/exercise-configs/:configId
 */
const updateAssignment = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const { user } = req;

  // SECURITY: Verify center ownership before updating
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }
  if (assignment.centerId !== user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this assignment');
  }

  const updated = await exerciseAssignmentService.updateAssignment(assignmentId, req.body);

  res.json({
    message: 'Assignment updated successfully',
    data: updated,
  });
});

/**
 * Remove assignment (unassign config from patient)
 * DELETE /patients/:patientId/exercise-configs/:configId
 */
const removeAssignment = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const { user } = req;

  // SECURITY: Verify center ownership before removing
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }
  if (assignment.centerId !== user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this assignment');
  }

  await exerciseAssignmentService.removeAssignment(assignmentId, req.body);

  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Record session completion
 * POST /patients/:patientId/exercise-configs/:configId/sessions
 */
const recordSession = catchAsync(async (req, res) => {
  const { patientId, assignmentId } = req.params;
  const { user } = req;
  const sessionData = pick(req.body, ['completedAt', 'score', 'duration', 'notes']);

  // SECURITY: Verify assignment belongs to user's center
  const assignment = await exerciseAssignmentService.getAssignmentById(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');
  }
  if (assignment.centerId !== user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to record session for this assignment');
  }

  const updated = await exerciseAssignmentService.recordSession(patientId, assignmentId, sessionData);

  res.json({
    message: 'Session recorded successfully',
    data: updated,
  });
});

/**
 * Get assignment statistics
 * GET /assignments/stats
 */
const getAssignmentStats = catchAsync(async (req, res) => {
  const { user } = req;
  // SECURITY: Always filter by user's centerId
  const filter = { centerId: user.centerId };

  const stats = await exerciseAssignmentService.getAssignmentStats(filter);

  res.json({
    message: 'Assignment statistics retrieved successfully',
    data: stats,
  });
});

/**
 * POST /exercise-assignments/maintenance/sync-sessions
 * Align incomplete session snapshots + recalculate stats (admin/doctor).
 */
const syncAssignmentSessions = catchAsync(async (req, res) => {
  const { user } = req;
  const { patientId, assignmentId } = pick(req.query, ['patientId', 'assignmentId']);

  const filter = { centerId: user.centerId };
  if (patientId != null && patientId !== '') {
    filter.patientId = Number(patientId);
  }
  if (assignmentId != null && assignmentId !== '') {
    filter.assignmentId = Number(assignmentId);
  }

  const result = await exerciseAssignmentService.syncAllActiveAssignmentSessions(filter);

  res.json({
    message: 'Exercise session snapshots synced',
    data: result,
  });
});

module.exports = {
  assignConfigToPatients,
  getConfigAssignments,
  getPatientAssignments,
  getAssignment,
  updateAssignment,
  removeAssignment,
  recordSession,
  getAssignmentStats,
  syncAssignmentSessions,
};
