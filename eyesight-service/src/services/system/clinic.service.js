const httpStatus = require('http-status');
const { Op } = require('sequelize');
const { Clinic } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { removeAccents, escapeRegExp } = require('../../utils/common');
const { FILTERS } = require('../../utils/query');
const auditLogService = require('./auditLog.service');
const {
  standardQuery,
  standardCreate,
  standardUpdate,
  standardHardDelete,
  standardBulkHardDelete,
  standardGetById,
  standardGetByField,
} = require('../../utils/patterns');

/**
 * Create a clinic
 * @param {Object} clinicBody
 * @returns {Promise<User>}
 */
const createClinic = async (clinicBody) => {
  if (await Clinic.isDuplicateCode(clinicBody.code, clinicBody.centerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã phòng khám đã tồn tại');
  }

  const clinic = await standardCreate(Clinic, clinicBody);

  await auditLogService.logEntityAuditEvent({
    action: 'clinic.create',
    entityType: 'clinic',
    entityId: clinic.id,
    centerId: clinic.centerId,
    actorUserId: clinicBody.updatedBy || null,
    metadata: {
      code: clinic.code,
      name: clinic.name,
    },
  });

  return clinic;
};

/**
 * Query for clinics
 * @param {Object} originalFilter - Filter conditions
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {string} [options.order] - Sort order (ASC|DESC)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<{rows: Clinic[], count: number, limit: number, page: number, totalPages: number}>}
 */
const queryClinics = async (originalFilter, options) => {
  const filter = { ...originalFilter };

  // Handle search param - search across multiple fields
  if (originalFilter.search) {
    filter[Op.or] = [
      FILTERS.textSearch('name', originalFilter.search),
      FILTERS.textSearch('code', originalFilter.search),
      FILTERS.textSearch('phoneNumber', originalFilter.search),
    ];
    delete filter.search;
  } else if (originalFilter.name) {
    // Fallback to old nameEng search for backward compatibility
    filter.nameEng = { [Op.iRegexp]: removeAccents(escapeRegExp(originalFilter.name)) };
    delete filter.name;
  }

  return standardQuery(Clinic, filter, options);
};

/**
 * Get clinic by id
 * @param {ObjectId} id
 * @returns {Promise<Clinic>}
 */
const getClinicById = async (id) => {
  return standardGetById(Clinic, id);
};

/**
 * Get clinic by code
 * @param {string} code
 * @returns {Promise<Clinic>}
 */
const getClinicByCode = async (code) => {
  return standardGetByField(Clinic, 'code', code);
};

/**
 * Update clinic by id
 * @param {number} clinicId
 * @param {Object} updateBody
 * @returns {Promise<Clinic>}
 */
const updateClinicById = async (clinicId, updateBody) => {
  const clinic = await standardUpdate(Clinic, clinicId, updateBody, 'Phòng khám');

  await auditLogService.logEntityAuditEvent({
    action: 'clinic.update',
    entityType: 'clinic',
    entityId: clinic.id,
    centerId: clinic.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      updatedFields: Object.keys(updateBody || {}),
    },
  });

  return clinic;
};

/**
 * Delete clinic by id (hard delete)
 * @param {number} clinicId
 * @returns {Promise<Clinic>}
 */
const deleteClinicById = async (clinicId, deleteBody = {}) => {
  const clinic = await standardHardDelete(Clinic, clinicId, 'Phòng khám');

  await auditLogService.logEntityAuditEvent({
    action: 'clinic.delete',
    entityType: 'clinic',
    entityId: clinic.id,
    centerId: clinic.centerId,
    actorUserId: deleteBody.updatedBy || null,
  });

  return clinic;
};

/**
 * Delete clinics by ids (hard delete)
 * @param {number[]} clinicIds
 * @returns {Promise<number>}
 */
const deleteClinicByIds = async (deleteBody) => {
  const ids = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
  const affectedCount = await standardBulkHardDelete(Clinic, ids);

  await auditLogService.logEntityAuditEvent({
    action: 'clinic.bulkDelete',
    entityType: 'clinic',
    centerId: deleteBody?.centerId ?? null,
    actorUserId: deleteBody?.updatedBy || null,
    metadata: {
      ids,
      affectedCount,
    },
  });

  return affectedCount;
};

module.exports = {
  createClinic,
  queryClinics,
  getClinicById,
  getClinicByCode,
  updateClinicById,
  deleteClinicById,
  deleteClinicByIds,
};
