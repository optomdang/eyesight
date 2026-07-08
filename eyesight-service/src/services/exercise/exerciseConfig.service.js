const httpStatus = require('http-status');
const { Op } = require('sequelize');
const ApiError = require('../../utils/ApiError');
const { ExerciseConfig, Exercise, ExerciseAssignment, User, Configuration } = require('../../models');
const { buildPagination, sanitizePagination, buildSortBy } = require('../../utils/query');
const auditLogService = require('../system/auditLog.service');

/**
 * Validate visionType for config creation (no level validation needed)
 * @param {Object} configData - Configuration data to validate
 */
const validateVisionTypeLevel = (configData) => {
  const { visionType } = configData;

  if (visionType) {
    const validTypes = ['far', 'near', 'contrast', 'stereopsis'];
    if (!validTypes.includes(visionType)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid visionType: ${visionType}. Must be one of: ${validTypes.join(', ')}`
      );
    }
  }
};

/**
 * Convert visionLevel number to vision string representation
 * @param {string} visionType - Type of vision (far, near, contrast)
 * @param {number} visionLevel - Level number
 * @returns {string} Vision string representation
 */
const _getVisionString = (visionType, visionLevel) => {
  const visionMaps = {
    far: {
      1: '20/400',
      2: '20/320',
      3: '20/250',
      4: '20/200',
      5: '20/160',
      6: '20/125',
      7: '20/100',
      8: '20/80',
      9: '20/63',
      10: '20/50',
      11: '20/40',
      12: '20/32',
      13: '20/25',
      14: '20/20',
      15: '20/16',
      16: '20/12.5',
      17: '20/10',
      18: '20/8',
      19: '20/6.3',
      20: '20/5',
    },
    near: {
      1: 'N3',
      2: 'N5',
      3: 'N8',
      4: 'N12',
      5: 'N16',
      6: 'N24',
    },
    contrast: {
      1: '2.5%',
      2: '5%',
      3: '10%',
      4: '15%',
      5: '20%',
      6: '25%',
      7: '30%',
      8: '40%',
      9: '50%',
      10: '60%',
      11: '70%',
      12: '80%',
      13: '85%',
      14: '90%',
      15: '95%',
      16: '100%',
    },
  };

  return visionMaps[visionType]?.[visionLevel] || `Level ${visionLevel}`;
};

/**
 * Whether the user may read/update/delete this exercise config (list filtering is separate).
 * @param {Object} config
 * @param {Object} user
 * @returns {boolean}
 */
const isAdminManagedConfigType = (configType) =>
  configType === 'admin' || configType === 'system';

const canUserAccessExerciseConfig = (config, user) => {
  if (!config || !user) {
    return true;
  }
  if (config.centerId !== user.centerId) {
    return false;
  }
  if (user.userType === 'admin') {
    // Admin: full access within center (incl. legacy `system` templates from demo seed)
    return true;
  }
  if (user.userType === 'doctor') {
    if (isAdminManagedConfigType(config.configType)) {
      return true;
    }
    if (config.configType === 'doctor') {
      return config.createdBy === user.id;
    }
    return false;
  }
  return isAdminManagedConfigType(config.configType);
};

/**
 * Create an exercise configuration
 * @param {Object} configBody
 * @param {Transaction} transaction - Database transaction
 * @returns {Promise<ExerciseConfig>}
 */
const createExerciseConfig = async (configBody, transaction = null) => {
  // Check if exerciseId exists and is valid
  if (!configBody.exerciseId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID bài tập là bắt buộc');
  }
  if (!configBody.centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID trung tâm là bắt buộc');
  }

  if (!configBody.visionType) {
    configBody.visionType = 'far';
  }

  // Validate visionType and visionLevel relationship
  validateVisionTypeLevel(configBody);

  if (!configBody.levelOverride) {
    configBody.levelOverride = false;
    configBody.visionLevel = null;
  }

  // Set createdBy = updatedBy for new records
  configBody.createdBy = configBody.updatedBy;

  const config = await ExerciseConfig.create(configBody, { transaction });

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseConfig.create',
    entityType: 'exerciseConfig',
    entityId: config.id,
    centerId: config.centerId,
    actorUserId: configBody.updatedBy || null,
    metadata: {
      exerciseId: config.exerciseId,
      configType: config.configType,
      name: config.name,
    },
  });

  return config;
};

/**
 * Query for exercise configurations
 * @param {Object} filter - Filter criteria
 * @param {Object} options - Query options
 * @param {Object} user - Current user for role-based filtering
 * @returns {Promise<{rows: ExerciseConfig[], count: number, limit: number, page: number, totalPages: number}>}
 */
const queryExerciseConfigs = async (filter, options, user = null) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['createdAt', 'exercise.name', 'configType']);

  // Build where clause with role-based filtering
  let whereClause = { ...filter };

  if (user) {
    if (user.userType === 'admin') {
      // Admin exercise list: system templates (admin + legacy system from demo seed)
      whereClause.configType = { [Op.in]: ['admin', 'system'] };
    } else if (user.userType === 'doctor') {
      // Doctor: system configs + configs they created (not other doctors')
      whereClause = {
        ...whereClause,
        [Op.or]: [{ configType: 'admin' }, { configType: 'doctor', createdBy: user.id }],
      };
    } else {
      whereClause.configType = 'admin';
    }
  }

  const { count, rows } = await ExerciseConfig.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Exercise,
        as: 'exercise',
        attributes: ['id', 'name', 'code', 'exerciseType', 'description'],
      },
      {
        model: User,
        as: 'createdByUser',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
    limit,
    offset,
    order,
  });

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Get exercise config by ID
 * @param {number} id
 * @returns {Promise<ExerciseConfig>}
 */
const getExerciseConfigById = async (id) => {
  return ExerciseConfig.findByPk(id, {
    include: [
      {
        model: Exercise,
        as: 'exercise',
        attributes: ['id', 'name', 'code', 'exerciseType', 'description'],
      },
    ],
  });
};

/**
 * Get exercise config by exercise type and code
 * @param {string} exerciseType
 * @param {string} code
 * @returns {Promise<ExerciseConfig>}
 */
/**
 * Get exercise config by exercise ID
 * @param {number} exerciseId
 * @param {number} [centerId] - Optional center ID for filtering
 * @returns {Promise<ExerciseConfig>}
 */
const getExerciseConfigByExerciseId = async (exerciseId, centerId) => {
  const whereClause = { exerciseId, deleted: false, patientId: null };
  if (centerId) {
    whereClause.centerId = centerId;
  }
  return ExerciseConfig.findOne({ where: whereClause });
};

/**
 * Update exercise config by ID
 * @param {number} configId
 * @param {Object} updateBody
 * @returns {Promise<ExerciseConfig>}
 */
const updateExerciseConfigById = async (configId, updateBody) => {
  const config = await getExerciseConfigById(configId);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cấu hình bài tập không tồn tại');
  }

  // Validate visionType and visionLevel relationship
  validateVisionTypeLevel(updateBody);

  if ('levelOverride' in updateBody && !updateBody.levelOverride) {
    updateBody.visionLevel = null;
    updateBody.levelOverride = false;
  }

  Object.assign(config, updateBody);
  await config.save();

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseConfig.update',
    entityType: 'exerciseConfig',
    entityId: config.id,
    centerId: config.centerId,
    actorUserId: updateBody.updatedBy || null,
    metadata: {
      exerciseId: config.exerciseId,
      updatedFields: Object.keys(updateBody || {}),
    },
  });

  return config;
};

/**
 * Delete exercise config by ID
 * @param {number} configId
 * @returns {Promise<ExerciseConfig>}
 */
const deleteExerciseConfigById = async (configId, deleteBody = {}) => {
  const config = await getExerciseConfigById(configId);
  if (!config) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cấu hình bài tập không tồn tại');
  }
  await config.destroy();

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseConfig.delete',
    entityType: 'exerciseConfig',
    entityId: config.id,
    centerId: config.centerId,
    actorUserId: deleteBody.updatedBy || null,
    metadata: {
      exerciseId: config.exerciseId,
    },
  });

  return config;
};

/**
 * Bulk delete exercise configs by IDs
 * @param {number[]} ids
 * @param {Object} user - Current user for centerId scoping
 * @returns {Promise<number>} affected count
 */
const deleteExerciseConfigsByIds = async (ids, user = null) => {
  const whereClause = { id: ids };
  if (user?.centerId) {
    whereClause.centerId = user.centerId;
  }

  let idsToDelete = ids;
  if (user) {
    const configs = await ExerciseConfig.findAll({ where: whereClause });
    idsToDelete = configs.filter((config) => canUserAccessExerciseConfig(config, user)).map((config) => config.id);
    if (idsToDelete.length === 0) {
      return 0;
    }
    whereClause.id = idsToDelete;
  }

  const affectedCount = await ExerciseConfig.destroy({ where: whereClause });

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseConfig.bulkDelete',
    entityType: 'exerciseConfig',
    centerId: user?.centerId ?? null,
    actorUserId: user?.id || null,
    metadata: { ids, affectedCount },
  });

  return affectedCount;
};

/**
 * Get exercise assignments for patient (replaces PatientExerciseConfigs)
 * @param {number} patientId
 * @param options
 * @returns {Promise<ExerciseAssignment>}
 */
const getPatientExerciseConfigs = async (patientId, options) => {
  const { limit, page, offset } = sanitizePagination(options.limit, options.page, 100);
  const order = buildSortBy(options.sortBy, ['createdAt', 'status']);
  const filter = {
    patientId,
  };
  const { count, rows } = await ExerciseAssignment.findAndCountAll({
    where: filter,
    limit,
    offset,
    order,
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
      },
    ],
  });

  return {
    rows,
    ...buildPagination(count, limit, page),
  };
};

/**
 * Get exercise assignment by ID (replaces getPatientExerciseConfig)
 * @returns {Promise<ExerciseAssignment>}
 * @param assignmentId
 */
const getPatientExerciseConfig = async (assignmentId) => {
  return ExerciseAssignment.findByPk(assignmentId, {
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
      },
    ],
  });
};

/**
 * Get exercise assignment by patient and exercise (replaces getPatientExerciseConfigByExerciseId)
 * @param {number} patientId
 * @param exerciseId
 * @returns {Promise<ExerciseAssignment>}
 */
const getPatientExerciseConfigByExerciseId = async (patientId, exerciseId) => {
  return ExerciseAssignment.findOne({
    where: {
      patientId,
    },
    include: [
      {
        model: ExerciseConfig,
        as: 'exerciseConfig',
        where: {
          exerciseId,
        },
      },
    ],
  });
};

/**
 * Create exercise assignment (replaces createPatientExerciseConfig)
 * @param {Object} assignmentBody
 * @returns {Promise<ExerciseAssignment>}
 */
const createPatientExerciseConfig = async (assignmentBody) => {
  // Validate required fields for ExerciseAssignment
  if (!assignmentBody.patientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID bệnh nhân là bắt buộc');
  }
  if (!assignmentBody.exerciseConfigId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID cấu hình bài tập là bắt buộc');
  }
  if (!assignmentBody.centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID trung tâm là bắt buộc');
  }

  // Remove id, createdAt, updatedAt from assignmentBody as these should be auto-generated
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...createData } = assignmentBody;

  // Set assignedBy = assignedBy for new records
  createData.assignedBy = createData.assignedBy || createData.updatedBy;

  return ExerciseAssignment.create(createData);
};

/**
 * Update exercise assignment (replaces updatePatientExerciseConfig)
 * @param assignmentId
 * @param {Object} updateBody
 * @returns {Promise<ExerciseAssignment>}
 */
const updatePatientExerciseConfig = async (assignmentId, updateBody) => {
  const assignment = await getPatientExerciseConfig(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }
  Object.assign(assignment, updateBody);
  await assignment.save();
  return assignment;
};

/**
 * Delete exercise assignment (replaces deletePatientExerciseConfig)
 * @returns {Promise<ExerciseAssignment>}
 * @param assignmentId
 */
const deletePatientExerciseConfig = async (assignmentId) => {
  const assignment = await getPatientExerciseConfig(assignmentId);
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao không tồn tại');
  }
  await assignment.destroy();
  return assignment;
};

/**
 * Assign template to patient (create patient-specific config from template)
 * @param {Object} configData - Configuration data including template info
 * @returns {Promise<ExerciseConfig>}
 */
const assignTemplateToPatient = async (configData) => {
  // Validate required fields
  if (!configData.exerciseId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID bài tập là bắt buộc');
  }
  if (!configData.patientId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID bệnh nhân là bắt buộc');
  }
  if (!configData.centerId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ID trung tâm là bắt buộc');
  }

  // Check if patient already has a config for this exercise
  const existingConfig = await ExerciseConfig.findOne({
    where: {
      exerciseId: configData.exerciseId,
      patientId: configData.patientId,
      deleted: false,
    },
  });

  if (existingConfig) {
    throw new ApiError(httpStatus.CONFLICT, 'Bệnh nhân đã có cấu hình cho bài tập này');
  }

  // Create patient config
  const patientConfigData = {
    ...configData,
    configType: 'patient',
    deleted: false,
  };

  const config = await ExerciseConfig.create(patientConfigData);

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseConfig.assignTemplate',
    entityType: 'exerciseConfig',
    entityId: config.id,
    centerId: config.centerId,
    actorUserId: configData.updatedBy || null,
    metadata: {
      exerciseId: config.exerciseId,
      patientId: config.patientId,
      configType: config.configType,
    },
  });

  return config;
};

/**
 * Default anaglyph / exercise color presets (overridable per center via Configuration).
 */
const DEFAULT_COLOR_SCHEME_PRESETS = {
  whiteBlack: {
    textColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  redBlue: {
    textColor: '#FF0000',
    backgroundColor: '#0000FF',
  },
  redGreen: {
    textColor: '#FF0000',
    backgroundColor: '#00FF00',
  },
  original: {
    textColor: '#776E65',
    backgroundColor: '#F9F6F2',
  },
};

const ANAGLYPH_PRESET_CONFIG_CODE = 'exercise';
const ANAGLYPH_PRESET_CONFIG_KEY = 'anaglyphColorPresets';

const mergePresetMaps = (stored) => ({
  ...DEFAULT_COLOR_SCHEME_PRESETS,
  ...(stored && typeof stored === 'object' ? stored : {}),
});

/**
 * Get color scheme presets for exercises (merged with center-specific overrides).
 * @param {number} [centerId]
 * @returns {Promise<Object>}
 */
const getColorSchemePresets = async (centerId) => {
  if (!centerId) {
    return { ...DEFAULT_COLOR_SCHEME_PRESETS };
  }

  const row = await Configuration.findOne({
    where: {
      centerId,
      code: ANAGLYPH_PRESET_CONFIG_CODE,
      key: ANAGLYPH_PRESET_CONFIG_KEY,
    },
  });

  return mergePresetMaps(row?.value);
};

/**
 * Save calibrated hex colors for one preset (admin — applies to whole center).
 * @param {number} centerId
 * @param {'redBlue'|'redGreen'|'whiteBlack'} preset
 * @param {{ textColor: string, backgroundColor: string }} colors
 * @param {number} updatedBy
 */
const saveColorSchemePreset = async (centerId, preset, colors, updatedBy) => {
  const allowed = ['redBlue', 'redGreen', 'whiteBlack'];
  if (!allowed.includes(preset)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Preset ${preset} cannot be saved globally`);
  }

  const hexPattern = /^#[0-9A-Fa-f]{6}$/;
  if (!hexPattern.test(colors.textColor) || !hexPattern.test(colors.backgroundColor)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid hex color');
  }

  const row = await Configuration.findOne({
    where: {
      centerId,
      code: ANAGLYPH_PRESET_CONFIG_CODE,
      key: ANAGLYPH_PRESET_CONFIG_KEY,
    },
  });

  const current = mergePresetMaps(row?.value);
  const nextValue = {
    ...current,
    [preset]: {
      textColor: colors.textColor.toUpperCase(),
      backgroundColor: colors.backgroundColor.toUpperCase(),
    },
  };

  if (row) {
    await row.update({ value: nextValue, updatedBy });
  } else {
    await Configuration.create({
      centerId,
      code: ANAGLYPH_PRESET_CONFIG_CODE,
      key: ANAGLYPH_PRESET_CONFIG_KEY,
      value: nextValue,
      updatedBy,
    });
  }

  await auditLogService.logEntityAuditEvent({
    action: 'exerciseConfig.saveColorPreset',
    entityType: 'configuration',
    entityId: row?.id ?? null,
    centerId,
    actorUserId: updatedBy,
    metadata: { preset, textColor: colors.textColor, backgroundColor: colors.backgroundColor },
  });

  return nextValue;
};

/** @deprecated sync alias — use getColorSchemePresets(centerId) */
const getColorSchemePresetsSync = () => ({ ...DEFAULT_COLOR_SCHEME_PRESETS });

module.exports = {
  createExerciseConfig,
  queryExerciseConfigs,
  canUserAccessExerciseConfig,
  getExerciseConfigById,
  getExerciseConfigByExerciseId,
  updateExerciseConfigById,
  deleteExerciseConfigById,
  deleteExerciseConfigsByIds,
  // Exercise assignment methods (updated from PatientExerciseConfig)
  getPatientExerciseConfig,
  getPatientExerciseConfigs,
  getPatientExerciseConfigByExerciseId,
  createPatientExerciseConfig,
  updatePatientExerciseConfig,
  deletePatientExerciseConfig,
  // Template-related methods
  assignTemplateToPatient,
  // Game 2048 methods
  getColorSchemePresets,
  saveColorSchemePreset,
  DEFAULT_COLOR_SCHEME_PRESETS,
};
