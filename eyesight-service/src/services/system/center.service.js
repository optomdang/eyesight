const httpStatus = require('http-status');
const { Op } = require('sequelize');
const { Center, Role } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { removeAccents, escapeRegExp } = require('../../utils/common');
const { getDefaultRolesConfig } = require('../../utils/defaultRoles');
const auditLogService = require('./auditLog.service');
const {
  standardQuery,
  standardUpdate,
  standardHardDelete,
  standardBulkHardDelete,
  standardGetById,
  standardGetByField,
  withTransaction,
} = require('../../utils/patterns');
const exerciseService = require('../exercise/exercise.service');
const exerciseConfigService = require('../exercise/exerciseConfig.service');
const {
  ensureDefaultExerciseModes,
} = require('./defaultExerciseModes.service');

/**
 * Create default roles for a center
 * @param {number} centerId - The center ID
 * @param {number} updatedBy - User ID who created the center
 * @param {Transaction} transaction - Database transaction
 * @returns {Promise<Role[]>} Array of created roles
 */
const createDefaultRoles = async (centerId, updatedBy, transaction = null) => {
  const defaultRoles = getDefaultRolesConfig(centerId, updatedBy);

  // IMPORTANT: create roles SEQUENTIALLY. Running these inserts in parallel on a single
  // transaction connection (Promise.all/allSettled) breaks the transaction on pooled
  // Postgres (Supabase/pgbouncer) — a failed/queued statement poisons the tx and the
  // error gets swallowed, causing the subsequent Exercise insert to fail with
  // "current transaction is aborted". Sequential chaining avoids no-await-in-loop too.
  const createdRoles = [];
  await defaultRoles.reduce(
    (prev, roleData) =>
      prev.then(async () => {
        try {
          const role = await Role.create(roleData, { transaction });
          createdRoles.push(role);
        } catch (error) {
          // Tolerate an already-existing role (won't happen for a brand-new center).
          if (error.name !== 'SequelizeUniqueConstraintError') {
            throw error;
          }
        }
      }),
    Promise.resolve()
  );

  return createdRoles;
};

/**
 * Create default exercise for a center
 * @param {number} centerId - The center ID
 * @param {number} updatedBy - User ID who created the center
 * @param {Transaction} transaction - Database transaction
 * @returns {Promise<Exercise>} Created exercise
 */
const createDefaultExercise = async (centerId, updatedBy, transaction = null) => {
  const defaultExerciseData = {
    name: 'Bài tập 2048',
    code: '2048',
    description: 'Bài tập mặc định 2048 cho trung tâm',
    exerciseType: '2048',
    status: 'active',
    centerId,
    createdBy: updatedBy,
    updatedBy,
  };

  try {
    return await exerciseService.createExercise(defaultExerciseData, transaction);
  } catch (error) {
    // If exercise already exists, return null
    if (error.statusCode === httpStatus.BAD_REQUEST && error.message.includes('Mã bài tập đã tồn tại')) {
      return null;
    }
    throw error;
  }
};

/**
 * Create default exercise configuration for a center
 * @param {number} exerciseId - The exercise ID
 * @param {number} centerId - The center ID
 * @param {number} updatedBy - User ID who created the center
 * @param {Transaction} transaction - Database transaction
 * @returns {Promise<ExerciseConfig>} Created exercise configuration
 */
const createDefaultExerciseConfig = async (exerciseId, centerId, updatedBy, transaction = null) => {
  const defaultConfigData = {
    exerciseId,
    configType: 'admin', // Admin default configuration
    name: 'Cấu hình mặc định', // Default configuration name
    patientId: null, // null = default config for all patients
    visionType: 'far',
    eye: 'both', // Default: cả hai mắt
    duration: 5, // Default: 5 phút
    frequency: 'daily', // Default: hàng ngày
    executionCount: 1, // Default: 1 lần/buổi
    // Use default values from model for levels, passConditions, autoAdjustmentRules
    notificationSettings: {
      enabled: false,
      methods: [],
      maxReminders: 3,
      reminderInterval: 24,
    },
    centerId,
    createdBy: updatedBy,
    updatedBy,
  };

  return exerciseConfigService.createExerciseConfig(defaultConfigData, transaction);
};

/**
 * Create a center
 * @param {Object} centerBody
 * @returns {Promise<Center>}
 */
const createCenter = async (centerBody) => {
  if (await Center.isDuplicateCode(centerBody.code)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã trung tâm đã tồn tại');
  }

  // Use transaction wrapper for complex operation
  return withTransaction(async (transaction) => {
    // Set createdBy = updatedBy for new records
    centerBody.createdBy = centerBody.updatedBy;

    // Create the center
    const center = await Center.create(centerBody, { transaction });

    // Create default roles for the center
    await createDefaultRoles(center.id, centerBody.updatedBy, transaction);

    // Provision system catalog: base exercises + 15 admin training modes
    await ensureDefaultExerciseModes(center.id, centerBody.updatedBy, transaction);

    await auditLogService.logEntityAuditEvent({
      action: 'center.create',
      entityType: 'center',
      entityId: center.id,
      centerId: center.id,
      actorUserId: centerBody.updatedBy || null,
      metadata: {
        code: center.code,
        name: center.name,
        defaultExerciseModes: true,
      },
    });

    return center;
  });
};

/**
 * Query for centers
 * @param {Object} originalFilter - Filter conditions
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {string} [options.order] - Sort order (ASC|DESC)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<{rows: Center[], count: number, limit: number, page: number, totalPages: number}>}
 */
const queryCenters = async (originalFilter, options) => {
  const filter = { ...originalFilter, deleted: false };

  // Handle name search with accent removal
  if (originalFilter.name) {
    filter.nameEng = { [Op.iRegexp]: removeAccents(escapeRegExp(originalFilter.name)) };
    delete filter.name;
  }

  // Use standardized query pattern
  return standardQuery(Center, filter, options);
};

/**
 * Get center by id
 * @param {ObjectId} id
 * @returns {Promise<Center>}
 */
const getCenterById = async (id) => {
  return standardGetById(Center, id);
};

/**
 * Get center by code
 * @param {string} code
 * @returns {Promise<Center>}
 */
const getCenterByCode = async (code) => {
  return standardGetByField(Center, 'code', code);
};

/**
 * Update center by id
 * @param {number} centerId
 * @param {Object} updateBody
 * @returns {Promise<Center>}
 */
const updateCenterById = async (centerId, updateBody) => {
  const center = await standardUpdate(Center, centerId, updateBody, 'Trung tâm');

  await auditLogService.logEntityAuditEvent({
    action: 'center.update',
    entityType: 'center',
    entityId: center.id,
    centerId: center.id,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      updatedFields: Object.keys(updateBody || {}),
    },
  });

  return center;
};

/**
 * Delete center by id (hard delete)
 * @param {number} centerId
 * @returns {Promise<Center>}
 */
const deleteCenterById = async (centerId, deleteBody = {}) => {
  const center = await standardHardDelete(Center, centerId, 'Trung tâm');

  await auditLogService.logEntityAuditEvent({
    action: 'center.delete',
    entityType: 'center',
    entityId: center.id,
    centerId: center.id,
    actorUserId: deleteBody.updatedBy || null,
  });

  return center;
};

/**
 * Delete centers by ids (hard delete)
 * @param {number[]} centerIds
 * @returns {Promise<number>}
 */
const deleteCenterByIds = async (deleteBody) => {
  const ids = Array.isArray(deleteBody) ? deleteBody : deleteBody?.ids;
  const affectedCount = await standardBulkHardDelete(Center, ids);

  await auditLogService.logEntityAuditEvent({
    action: 'center.bulkDelete',
    entityType: 'center',
    actorUserId: deleteBody?.updatedBy || null,
    metadata: {
      ids,
      affectedCount,
    },
  });

  return affectedCount;
};

module.exports = {
  createCenter,
  createDefaultRoles,
  createDefaultExercise,
  createDefaultExerciseConfig,
  ensureDefaultExerciseModes,
  queryCenters,
  getCenterById,
  getCenterByCode,
  updateCenterById,
  deleteCenterById,
  deleteCenterByIds,
};
