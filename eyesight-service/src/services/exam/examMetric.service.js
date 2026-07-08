const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { ExamMetric } = require('../../models');
const { buildPagination, sanitizePagination, buildSortBy } = require('../../utils/query');
const auditLogService = require('../system/auditLog.service');

/**
 * Create exam metric
 */
const createExamMetric = async (metricData) => {
  // Set createdBy = updatedBy for new records
  metricData.createdBy = metricData.updatedBy;

  const metric = await ExamMetric.create(metricData);

  await auditLogService.logEntityAuditEvent({
    action: 'examMetric.create',
    entityType: 'examMetric',
    entityId: metric.id,
    centerId: metric.centerId,
    actorUserId: metricData.updatedBy || null,
    metadata: {
      examResultId: metric.examResultId,
      patientId: metric.patientId,
      examType: metric.examType,
    },
  });

  return metric;
};

/**
 * Query exam metrics with filters
 */
const queryExamMetrics = async (filter, options) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['createdAt', 'metricName']);

  const { count, rows } = await ExamMetric.findAndCountAll({
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
 * Get exam metric by ID
 */
const getExamMetricById = async (id) => {
  const metric = await ExamMetric.findByPk(id);
  if (!metric) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Chỉ số khám không tồn tại');
  }
  return metric;
};

/**
 * Get exam metrics by exam result ID
 */
const getExamMetricsByExamResultId = async (examResultId) => {
  return ExamMetric.findAll({
    where: { examResultId },
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Update exam metric by ID
 */
const updateExamMetricById = async (id, updateData) => {
  const metric = await getExamMetricById(id);
  Object.assign(metric, updateData);
  await metric.save();

  await auditLogService.logEntityAuditEvent({
    action: 'examMetric.update',
    entityType: 'examMetric',
    entityId: metric.id,
    centerId: metric.centerId,
    actorUserId: updateData.updatedBy || null,
    metadata: {
      updatedFields: Object.keys(updateData || {}),
      examResultId: metric.examResultId,
    },
  });

  return metric;
};

/**
 * Delete exam metric by ID
 */
const deleteExamMetricById = async (id, deleteBody = {}) => {
  const metric = await getExamMetricById(id);
  await metric.destroy();

  await auditLogService.logEntityAuditEvent({
    action: 'examMetric.delete',
    entityType: 'examMetric',
    entityId: metric.id,
    centerId: metric.centerId,
    actorUserId: deleteBody.updatedBy || null,
  });

  return metric;
};

/**
 * Get latest metrics for patient by exam type
 */
const getLatestPatientMetrics = async (patientId, examType) => {
  const where = { patientId };
  if (examType) where.examType = examType;

  return ExamMetric.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: examType ? 1 : 4, // Latest for specific type or all types
  });
};

module.exports = {
  createExamMetric,
  queryExamMetrics,
  getExamMetricById,
  getExamMetricsByExamResultId,
  updateExamMetricById,
  deleteExamMetricById,
  getLatestPatientMetrics,
};
