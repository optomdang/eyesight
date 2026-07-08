const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const ExamAssignment = require('../../models/clinic/examAssignment.model');
const { shouldProvisionForPatient, provisionExamSession } = require('../../utils/sessionProvisionUtils');
const { sanitizePagination, buildSortBy, buildPagination } = require('../../utils/query');
const examSessionService = require('../exam/examSession.service');
const auditLogService = require('../system/auditLog.service');
const { calculateNextDueDate } = require('../../utils/common');

/**
 * Default exam configurations for new patients
 */
const DEFAULT_EXAM_CONFIGS = [
  { examType: 'far', frequency: 'weekly', isEnabled: true },
  { examType: 'near', frequency: 'weekly', isEnabled: true },
  { examType: 'contrast', frequency: 'monthly', isEnabled: true },
  { examType: 'stereopsis', frequency: 'monthly', isEnabled: true },
];

/**
 * Create exam configuration
 */
const createExamConfig = async (configData) => {
  // Check for duplicate (patientId + examType combination)
  const existing = await ExamAssignment.findOne({
    where: {
      patientId: configData.patientId,
      examType: configData.examType,
    },
  });

  if (existing) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Exam configuration for ${configData.examType} already exists for this patient`
    );
  }

  // Set createdBy = updatedBy for new records
  configData.createdBy = configData.updatedBy;

  const config = await ExamAssignment.create(configData);

  // Auto-provision today's exam session if patient is in treatment
  if (await shouldProvisionForPatient(config.patientId)) {
    await provisionExamSession(config);
  }

  await auditLogService.logEntityAuditEvent({
    action: 'examAssignment.create',
    entityType: 'examAssignment',
    entityId: config.id,
    centerId: config.centerId,
    actorUserId: configData.updatedBy || null,
    metadata: {
      patientId: config.patientId,
      examType: config.examType,
      isEnabled: config.isEnabled,
    },
  });

  return config;
};

/**
 * Query exam configurations with filters and pagination
 */
const queryExamConfigs = async (filter, options) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['patientId', 'examType', 'createdAt']);

  const { count, rows } = await ExamAssignment.findAndCountAll({
    where: filter,
    limit: parseInt(limit, 10),
    offset,
    order,
  });

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Get exam configuration by ID
 */
const getExamConfigById = async (id) => {
  const config = await ExamAssignment.findByPk(id);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cấu hình khám không tồn tại');
  }
  return config;
};

/**
 * Get patient's specific exam type configuration
 */
const getExamAssignment = async (patientId, examType) => {
  return ExamAssignment.findOne({
    where: { patientId, examType },
  });
};

/**
 * Get all exam configurations for a patient
 */
const getExamAssignments = async (patientId) => {
  return ExamAssignment.findAll({
    where: { patientId },
    order: [['examType', 'ASC']],
  });
};

/**
 * Update exam configuration by ID
 */
const updateExamConfigById = async (id, updateData) => {
  const config = await getExamConfigById(id);

  // If updating examType, check for duplicates
  if (updateData.examType && updateData.examType !== config.examType) {
    const existing = await ExamAssignment.findOne({
      where: {
        patientId: config.patientId,
        examType: updateData.examType,
        id: { [require('sequelize').Op.ne]: id },
      },
    });

    if (existing) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Exam configuration for ${updateData.examType} already exists for this patient`
      );
    }
  }

  Object.assign(config, updateData);
  await config.save();

  // After saving, ensure a session exists for the (possibly new) current cycle.
  // This is critical when frequency changes: the old session's scheduledDate may now
  // fall outside the new cycle range, so getCurrentActiveSession would return null
  // and the exam would disappear from the patient portal until the nightly cron runs.
  if (config.isEnabled && (await shouldProvisionForPatient(config.patientId))) {
    await provisionExamSession(config);
  }

  await auditLogService.logEntityAuditEvent({
    action: 'examAssignment.update',
    entityType: 'examAssignment',
    entityId: config.id,
    centerId: config.centerId,
    actorUserId: updateData.updatedBy || null,
    metadata: {
      updatedFields: Object.keys(updateData || {}),
      patientId: config.patientId,
      examType: config.examType,
      isEnabled: config.isEnabled,
    },
  });

  return config;
};

/**
 * Delete exam configuration by ID
 */
const deleteExamConfigById = async (id, deleteBody = {}) => {
  const config = await getExamConfigById(id);
  await config.destroy();

  await auditLogService.logEntityAuditEvent({
    action: 'examAssignment.delete',
    entityType: 'examAssignment',
    entityId: config.id,
    centerId: config.centerId,
    actorUserId: deleteBody.updatedBy || null,
    metadata: {
      patientId: config.patientId,
      examType: config.examType,
    },
  });

  return config;
};

/**
 * Initialize default exam configurations for a new patient
 */
const initializePatientConfigs = async (patientId, centerId, updatedBy, configsData = null) => {
  // Check if configs already exist
  const existingConfigs = await getExamAssignments(patientId);
  if (existingConfigs.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cấu hình kiểm tra đã tồn tại cho bệnh nhân này');
  }

  // Use provided configurations or default ones
  const configsToCreate =
    configsData ||
    DEFAULT_EXAM_CONFIGS.map((config) => ({
      ...config,
      patientId,
      centerId,
      updatedBy,
      notificationSettings: {
        enabled: true,
        beforeDays: 1,
        time: '09:00',
        methods: ['email'],
      },
    }));

  return ExamAssignment.bulkCreate(configsToCreate);
};

/**
 * Update patient's exam config by patient ID and exam type
 */
const updateExamAssignment = async (patientId, examType, updateData) => {
  const config = await getExamAssignment(patientId, examType);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, `Cấu hình khám cho ${examType} không tồn tại cho bệnh nhân này`);
  }

  Object.assign(config, updateData);
  await config.save();
  return config;
};

/**
 * Get exam dashboard data for a patient
 * Returns exam configs with computed status for each exam type
 */
const getDashboardData = async (patientId) => {
  const patientIdInt = parseInt(patientId, 10);
  if (!patientId || Number.isNaN(patientIdInt)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid patient ID');
  }

  // Get exam configurations for the patient
  const examConfigs = await getExamAssignments(patientIdInt);

  // Get all exam sessions for this patient in one query
  const allExamSessions = await examSessionService.queryExamSessions(
    { patientId: patientIdInt },
    { sortBy: 'createdAt:desc', limit: 1000 }
  );

  // Process each exam config and compute status
  const examStatuses = examConfigs.map((config) => {
    // Find last completed exam of this type
    const lastCompletedExam =
      allExamSessions.rows &&
      allExamSessions.rows.find((session) => session.examType === config.examType && session.status === 'completed');

    // Find current incomplete session of this type
    const incompleteSession =
      allExamSessions.rows &&
      allExamSessions.rows.find((session) => session.examType === config.examType && session.status === 'incomplete');

    // Determine status: incomplete | completed
    let status = 'incomplete';
    if (!incompleteSession && lastCompletedExam) {
      status = 'completed';
    }

    return {
      examType: config.examType,
      frequency: config.frequency,
      isEnabled: config.isEnabled,
      lastExamDate: lastCompletedExam?.completedAt || lastCompletedExam?.createdAt,
      nextDueDate: lastCompletedExam
        ? calculateNextDueDate(lastCompletedExam.completedAt || lastCompletedExam.createdAt, config.frequency)
        : undefined,
      status,
      currentSession: incompleteSession || null,
      config: {
        id: config.id,
        notificationSettings: config.notificationSettings,
      },
    };
  });

  return examStatuses;
};

module.exports = {
  createExamConfig,
  queryExamConfigs,
  getExamConfigById,
  getExamAssignment,
  getExamAssignments,
  updateExamConfigById,
  updateExamAssignment,
  deleteExamConfigById,
  initializePatientConfigs,
  getDashboardData,
};
