const httpStatus = require('http-status');
const { ExamResult } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { FIELDS, buildQuery, buildPagination, sanitizePagination, buildSortBy, buildFilter } = require('../../utils/query');

const createExamResult = async (examResultData) => {
  if (await ExamResult.isDuplicateCode(examResultData.code, examResultData.centerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã kết quả khám đã tồn tại');
  }

  // Set createdBy = updatedBy for new records
  examResultData.createdBy = examResultData.updatedBy;

  // Create the exam result directly (no need for LatestExamResult with independent exam logic)
  const result = await ExamResult.create(examResultData);
  return result;
};

/**
 * Get incomplete exam result for patient and exam type
 * Optimized: uses indexes on (patientId, examType, status)
 */
const getIncompleteExamResult = async (patientId, examType) => {
  return ExamResult.findOne({
    attributes: FIELDS.examResultList,
    where: {
      patientId,
      examType,
      status: 'incomplete',
      deleted: false,
    },
    raw: true,
  });
};

/**
 * Query exam results with pagination
 * Optimized: uses composite indexes, field selection, and optimized sorting
 */
const queryExamResults = async (originalFilter, options) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['createdAt', 'status', 'examType', 'patientId']);

  const filter = buildFilter(originalFilter, originalFilter.centerId);

  const queryOptions = buildQuery('examResultList', limit, offset, order);
  queryOptions.where = filter;

  const { count, rows } = await ExamResult.findAndCountAll(queryOptions);

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Get exam result by ID (detail view with full data)
 * Optimized: selects full detail fields
 */
const getExamResultById = async (id) => {
  return ExamResult.findByPk(id, {
    attributes: FIELDS.examResultDetail,
    raw: true,
  });
};

/**
 * Get exam result by code
 * Optimized: uses unique code index
 */
const getExamResultByCode = async (code) => {
  return ExamResult.findOne({
    attributes: FIELDS.examResultDetail,
    where: { code, deleted: false },
    raw: true,
  });
};

/**
 * Get exam results by patient ID with pagination
 * Optimized: uses index on (patientId, createdAt DESC)
 */
const getExamResultsByPatientId = async (patientId, options) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy || 'createdAt:DESC', ['createdAt', 'status']);

  const queryOptions = buildQuery('examResultList', limit, offset, order);
  queryOptions.where = { patientId, deleted: false };

  const { count, rows } = await ExamResult.findAndCountAll(queryOptions);

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Get latest exam result by patient ID and optionally by test type
 * Optimized: uses index on (patientId, createdAt DESC)
 * @param {number} patientId
 * @param {string} examType - Optional exam type filter
 * @returns {Promise<ExamResult>}
 */
const getLatestExamResultByPatientId = async (patientId, examType) => {
  if (!patientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID bệnh nhân là bắt buộc');
  }

  const whereClause = {
    patientId,
    deleted: false,
  };

  // Add test type filter if provided
  if (examType) {
    whereClause.examType = examType;
  }

  const latestResult = await ExamResult.findOne({
    attributes: FIELDS.examResultDetail,
    where: whereClause,
    order: [['createdAt', 'DESC']],
    raw: true,
  });

  return latestResult;
};

const updateExamResultById = async (resultId, updateBody) => {
  // For updates, we need the full node instance (not raw object)
  const result = await ExamResult.findByPk(resultId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả khám không tồn tại');
  }

  if (updateBody.code && (await ExamResult.isDuplicateCode(updateBody.code, result.centerId, resultId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã kết quả khám đã tồn tại');
  }

  Object.assign(result, updateBody);
  await result.save();

  return result;
};

const deleteExamResultById = async (resultId) => {
  const result = await ExamResult.findByPk(resultId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Kết quả khám không tồn tại');
  }

  // Simple soft delete
  result.deleted = true;
  result.deletedAt = new Date();
  await result.save();

  return result;
};

const deleteExamResultByIds = async (resultIds) => {
  return ExamResult.update({ deleted: true, deletedAt: new Date() }, { where: { id: resultIds } });
};

module.exports = {
  createExamResult,
  queryExamResults,
  getExamResultById,
  getExamResultByCode,
  getExamResultsByPatientId,
  getLatestExamResultByPatientId,
  updateExamResultById,
  deleteExamResultById,
  deleteExamResultByIds,
  getIncompleteExamResult,
};
