const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const examAssignmentService = require('../../services/clinic/examAssignment.service');
const examSessionService = require('../../services/exam/examSession.service');

const filterKeys = ['patientId', 'examType', 'isEnabled', 'centerId'];

/**
 * Create exam assignment for patient
 */
const createExamAssignment = catchAsync(async (req, res) => {
  const assignment = await examAssignmentService.createExamConfig(req.body);
  res.status(httpStatus.CREATED).send(assignment);
});

/**
 * Get exam assignments with filters
 */
const getExamAssignments = catchAsync(async (req, res) => {
  const filter = pick(req.query, filterKeys);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await examAssignmentService.queryExamConfigs(filter, options);
  res.send(result);
});

/**
 * Get patient's exam assignments
 */
const getExamAssignmentAssignments = catchAsync(async (req, res) => {
  const { patientId } = req.params;
  const filter = { patientId: parseInt(patientId, 10) };

  // Optional examType filter
  if (req.query.examType) {
    filter.examType = req.query.examType;
  }

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  // Set default limit to 100 for patient exam assignments
  if (!options.limit) {
    options.limit = 100;
  }

  const result = await examAssignmentService.queryExamConfigs(filter, options);
  result.rows = await Promise.all(
    result.rows.map(async (assignment) => {
      const currentSession = await examSessionService.getCurrentActiveSession(
        assignment.patientId,
        assignment.examType,
        assignment.frequency
      );
      return {
        ...assignment.get({ plain: true }),
        currentSession,
      };
    })
  );
  res.send(result);
});

/**
 * Get single exam assignment
 */
const getExamAssignment = catchAsync(async (req, res) => {
  const assignment = await examAssignmentService.getExamConfigById(req.params.configId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam assignment not found');
  }
  // SECURITY: Verify center ownership
  if (assignment.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to access this exam assignment');
  }
  res.send(assignment);
});

/**
 * Update exam assignment
 */
const updateExamAssignment = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before updating
  const existingAssignment = await examAssignmentService.getExamConfigById(req.params.configId);
  if (!existingAssignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam assignment not found');
  }
  if (existingAssignment.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this exam assignment');
  }

  const assignment = await examAssignmentService.updateExamConfigById(req.params.configId, req.body);
  res.send(assignment);
});

/**
 * Delete exam assignment
 */
const deleteExamAssignment = catchAsync(async (req, res) => {
  // SECURITY: Verify center ownership before deleting
  const existingAssignment = await examAssignmentService.getExamConfigById(req.params.configId);
  if (!existingAssignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam assignment not found');
  }
  if (existingAssignment.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this exam assignment');
  }

  await examAssignmentService.deleteExamConfigById(req.params.configId, req.body);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Toggle exam assignment status
 */
const toggleExamAssignment = catchAsync(async (req, res) => {
  const { configId } = req.params;
  const { isEnabled } = req.body;

  // SECURITY: Verify center ownership before updating
  const existingAssignment = await examAssignmentService.getExamConfigById(configId);
  if (!existingAssignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Exam assignment not found');
  }
  if (existingAssignment.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this exam assignment status');
  }

  const assignment = await examAssignmentService.updateExamConfigById(configId, {
    isEnabled,
    updatedBy: req.body.updatedBy || req.user.id,
  });
  res.send(assignment);
});

/**
 * Reopen the current-cycle completed exam and remove its result so the patient
 * can perform the configured test again from the beginning.
 */
const resetExamAssignmentForRetake = catchAsync(async (req, res) => {
  const patientId = Number(req.params.patientId);
  const assignment = await examAssignmentService.getExamConfigById(req.params.configId);

  if (assignment.patientId !== patientId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cấu hình bài kiểm tra không thuộc bệnh nhân này');
  }
  if (assignment.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Bạn không có quyền làm lại bài kiểm tra này');
  }
  if (!assignment.isEnabled) {
    throw new ApiError(httpStatus.CONFLICT, 'Cần kích hoạt bài kiểm tra trước khi cho phép làm lại');
  }

  const session = await examSessionService.getCurrentActiveSession(
    assignment.patientId,
    assignment.examType,
    assignment.frequency
  );
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy phiên kiểm tra trong chu kỳ hiện tại');
  }

  const resetSession = await examSessionService.resetExamSessionForRetake(session.id, {
    userId: req.user.id,
    userType: req.user.userType,
    requestContext: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestMethod: req.method,
      requestPath: req.originalUrl,
    },
  });
  res.send(resetSession);
});

module.exports = {
  createExamAssignment,
  getExamAssignments,
  getExamAssignmentAssignments,
  getExamAssignment,
  updateExamAssignment,
  deleteExamAssignment,
  toggleExamAssignment,
  resetExamAssignmentForRetake,
};
