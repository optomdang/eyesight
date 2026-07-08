/**
 * Query Optimization Utilities
 *
 * Concise helpers for optimized Sequelize queries:
 * - Field selection to reduce memory
 * - raw: true for faster object serialization
 * - Efficient pagination & sorting
 */

const { Op } = require('sequelize');
const logger = require('../config/logger');

/**
 * Safe field selection - returns only essential fields, avoids JSONB loading
 * This reduces memory footprint and database I/O significantly
 */
const FIELDS = {
  // Exam Results: exclude large JSONB fields (rawData, deviceInfo)
  examResultList: [
    'id',
    'code',
    'patientId',
    'examSessionId',
    'examType',
    'status',
    'leftEyeLevel',
    'rightEyeLevel',
    'bothEyeLevel',
    'startedAt',
    'completedAt',
    'createdAt',
  ],
  examResultDetail: [
    'id',
    'code',
    'patientId',
    'examSessionId',
    'examType',
    'status',
    'rawData',
    'distance',
    'charType',
    'accuracy',
    'leftEyeLevel',
    'rightEyeLevel',
    'bothEyeLevel',
    'leftEyeAccuracy',
    'rightEyeAccuracy',
    'bothEyeAccuracy',
    'startedAt',
    'completedAt',
    'reviewedBy',
    'reviewedAt',
    'centerId',
    'createdAt',
    'updatedAt',
  ],

  // Exam Sessions: exclude deviceInfo
  examSessionList: [
    'id',
    'code',
    'patientId',
    'doctorId',
    'status',
    'examType',
    'scheduledDate',
    'startedAt',
    'endedAt',
    'completedAt',
    'centerId',
    'createdAt',
  ],
  examSessionDetail: [
    'id',
    'code',
    'patientId',
    'doctorId',
    'status',
    'examType',
    'scheduledDate',
    'startedAt',
    'endedAt',
    'completedAt',
    'notes',
    'deviceInfo',
    'centerId',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ],

  // Exercise Results: exclude exerciseState (large JSONB), exerciseConfig (snapshot)
  exerciseResultList: [
    'id',
    'patientId',
    'exerciseSessionId',
    'exerciseAssignmentId',
    'exerciseId',
    'status',
    'level',
    'score',
    'duration',
    'movesCount',
    'accuracy',
    'focusScore',
    'resultMetrics',
    'startedAt',
    'completedAt',
    'createdAt',
  ],
  exerciseResultDetail: [
    'id',
    'patientId',
    'exerciseSessionId',
    'exerciseAssignmentId',
    'exerciseId',
    'status',
    'level',
    'score',
    'duration',
    'movesCount',
    'accuracy',
    'exerciseState',
    'exerciseConfig',
    'resultMetrics',
    'startedAt',
    'completedAt',
    'centerId',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
  ],

  // Exercise Sessions
  exerciseSessionList: [
    'id',
    'exerciseAssignmentId',
    'status',
    'scheduledDate',
    'startedAt',
    'endedAt',
    'completedAt',
    'createdAt',
  ],
  exerciseSessionDetail: [
    'id',
    'exerciseAssignmentId',
    'status',
    'scheduledDate',
    'startedAt',
    'endedAt',
    'completedAt',
    'passedCount',
    'failedCount',
    'centerId',
    'createdAt',
    'updatedAt',
  ],

  // Patients
  patientList: [
    'id',
    'code',
    'userId',
    'doctorId',
    'centerId',
    'treatmentStatus',
    'activeFrom',
    'activeTo',
    'severityLevel',
    'createdAt',
  ],
  patientDetail: [
    'id',
    'code',
    'userId',
    'doctorId',
    'clinicId',
    'centerId',
    'treatmentStatus',
    'activeFrom',
    'activeTo',
    'severityLevel',
    'medicalHistory',
    'additionalNotes',
    'createdAt',
    'updatedAt',
  ],

  // Exercise Assignments
  exerciseAssignmentList: [
    'id',
    'patientId',
    'exerciseConfigId',
    'visionLevel',
    'status',
    'assignedDate',
    'frequency',
    'centerId',
    'createdAt',
  ],
  exerciseAssignmentDetail: [
    'id',
    'patientId',
    'exerciseConfigId',
    'visionLevel',
    'status',
    'assignedDate',
    'frequency',
    'notes',
    'centerId',
    'createdAt',
    'updatedAt',
  ],

  // Exercise Configs
  exerciseConfigList: [
    'id',
    'exerciseId',
    'visionType',
    'contrast',
    'backgroundColor',
    'fontSize',
    'colorScheme',
    'centerId',
  ],
  exerciseConfigDetail: [
    'id',
    'exerciseId',
    'visionType',
    'contrast',
    'backgroundColor',
    'fontSize',
    'colorScheme',
    'frequency',
    'minScore',
    'minAccuracy',
    'duration',
    'centerId',
    'createdAt',
    'updatedAt',
  ],

  // Exam Assignments
  examAssignmentList: ['id', 'patientId', 'examType', 'status', 'frequency', 'assignedDate', 'centerId', 'createdAt'],
  examAssignmentDetail: [
    'id',
    'patientId',
    'examType',
    'status',
    'frequency',
    'assignedDate',
    'notes',
    'centerId',
    'createdAt',
    'updatedAt',
  ],

  // Exercises
  exerciseList: ['id', 'code', 'name', 'description', 'exerciseType', 'status', 'centerId', 'createdAt'],
  exerciseDetail: [
    'id',
    'code',
    'name',
    'description',
    'exerciseType',
    'iframeUrl',
    'documentationUrl',
    'centerId',
    'createdAt',
    'updatedAt',
  ],

  // Notifications
  notificationList: [
    'id',
    'code',
    'recipientId',
    'templateId',
    'channel',
    'status',
    'sendAttempts',
    'sentAt',
    'failureReason',
    'createdAt',
  ],
  notificationDetail: [
    'id',
    'code',
    'recipientId',
    'templateId',
    'channel',
    'status',
    'message',
    'variables',
    'sendAttempts',
    'sentAt',
    'failureReason',
    'createdAt',
  ],

  // Users
  userList: ['id', 'email', 'userType', 'centerId', 'roleId', 'deleted', 'createdAt'],
  userDetail: [
    'id',
    'email',
    'firstName',
    'lastName',
    'phone',
    'avatar',
    'userType',
    'centerId',
    'roleId',
    'deleted',
    'lastActivityAt',
    'createdAt',
    'updatedAt',
  ],
};

/**
 * Build optimized query options for findAll/findAndCountAll
 *
 * @param {string} modelType - e.g., 'examResultList', 'exerciseSessionDetail'
 * @param {number} limit - Records per page
 * @param {number} offset - Pagination offset
 * @param {Array} orderClause - Sequelize order clause (optional)
 * @param {Object} includeAssociations - Include relations (optional)
 * @returns {Object} Optimized query options
 */
const buildQuery = (modelType, limit = 10, offset = 0, orderClause, includeAssociations = null) => {
  const options = {
    attributes: FIELDS[modelType] || [],
    limit,
    offset,
    raw: true, // Return plain objects (2-3x faster serialization)
  };

  if (orderClause) {
    options.order = orderClause;
  }

  if (includeAssociations) {
    options.include = includeAssociations;
    options.subQuery = false; // Prevent Sequelize from adding subqueries (performance killer)
    options.distinct = true; // Count distinct rows when using joins
  }

  return options;
};

/**
 * Build pagination metadata
 *
 * @param {number} total - Total count of records
 * @param {number} limit - Records per page
 * @param {number} page - Current page (1-indexed)
 * @returns {Object} Pagination info
 */
const buildPagination = (total, limit, page) => {
  const totalPages = Math.ceil(total / limit);

  return {
    count: total, // alias for frontend compatibility
    total,
    limit,
    page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Safe pagination values - prevent abuse
 *
 * @param {number} limit - Requested limit
 * @param {number} page - Requested page
 * @param {number} maxLimit - Maximum allowed limit (default 100)
 * @returns {Object} {limit, offset, page}
 */
const sanitizePagination = (limit = 10, page = 1, maxLimit = 100) => {
  let finalLimit = parseInt(limit, 10) || 10;
  const finalPage = Math.max(1, parseInt(page, 10) || 1);

  // Enforce limits
  finalLimit = Math.min(finalLimit, maxLimit);
  finalLimit = Math.max(finalLimit, 1);

  const offset = (finalPage - 1) * finalLimit;

  return { limit: finalLimit, page: finalPage, offset };
};

/**
 * Build sort clause from parameter (e.g., "createdAt:DESC" or "user.name:ASC").
 * Also supports split params: sortBy="user.name" + orderParam="DESC"
 * (DataTableContext historically sent those as separate query keys.)
 *
 * @param {string} sortBy - Sort field, optionally with ":ASC|:DESC"
 * @param {Array|string} allowedFields - Whitelist of allowed fields (or legacy direction string)
 * @param {string} [orderParam] - Separate ASC/DESC when sortBy has no ":direction"
 * @returns {Array} Sequelize order clause
 */
const buildSortBy = (sortBy, allowedFields = [], orderParam) => {
  if (!sortBy) return [['createdAt', 'DESC']];

  // Legacy mistaken call shape from older tests: buildSortBy('name', 'ASC')
  let fields = allowedFields;
  let directionHint = orderParam;
  if (typeof allowedFields === 'string') {
    if (['ASC', 'DESC', 'asc', 'desc'].includes(allowedFields)) {
      fields = [];
      directionHint = allowedFields;
    } else {
      fields = [];
    }
  }

  let field;
  let direction;
  if (String(sortBy).includes(':')) {
    [field, direction] = String(sortBy).split(':');
  } else {
    field = String(sortBy);
    direction = directionHint;
  }

  const sortDir = ['DESC', 'ASC'].includes(direction?.toUpperCase())
    ? direction.toUpperCase()
    : 'ASC';

  // Validate field to prevent injection
  if (Array.isArray(fields) && fields.length > 0 && !fields.includes(field)) {
    return [['createdAt', 'DESC']]; // Fallback to default
  }

  // Nested association fields (e.g. "exercise.name") → [['exercise', 'name', 'ASC']]
  if (field.includes('.')) {
    const parts = field.split('.');
    return [[...parts, sortDir]];
  }

  return [[field, sortDir]];
};

/**
 * Common where clauses for multi-tenant isolation
 */
const WHERE_CLAUSES = {
  active: { deleted: false },
  center: (centerId) => ({ centerId, deleted: false }),
  patient: (patientId) => ({ patientId, deleted: false }),
  centerAndPatient: (centerId, patientId) => ({ centerId, patientId, deleted: false }),
  incompleteStatus: { status: 'incomplete', deleted: false },
};

/**
 * Build where clause with center isolation
 *
 * @param {Object} filter - Original filter
 * @param {number} centerId - Center ID (mandatory for multi-tenant)
 * @returns {Object} Enhanced where clause
 */
const buildFilter = (filter, centerId) => {
  if (!centerId) {
    throw new Error('centerId is required for multi-tenant isolation');
  }

  return {
    ...filter,
    centerId,
    deleted: false,
  };
};

/**
 * Optimized attribute selection for includes (reduce memory & I/O)
 */
const ATTRS = {
  USER_BASIC: ['id', 'name', 'email', 'phoneNumber'],
  USER_LIST: ['id', 'name', 'email', 'phoneNumber', 'lastLoginAt', 'userType'],
  USER_PROFILE: ['id', 'name', 'email', 'phoneNumber', 'address', 'dateOfBirth', 'gender', 'userType'],
  CENTER_BASIC: ['id', 'name', 'code'],
  CENTER_LIST: ['id', 'name', 'code', 'address', 'phoneNumber'],
  CLINIC_BASIC: ['id', 'name', 'code'],
  CLINIC_LIST: ['id', 'name', 'code', 'address', 'phoneNumber'],
  DOCTOR_BASIC: ['id', 'code', 'specialization'],
  DOCTOR_LIST: ['id', 'code', 'specialization', 'licenseNumber'],
  PATIENT_BASIC: ['id', 'code', 'userId'],
  PATIENT_LIST: ['id', 'code', 'userId', 'treatmentStatus', 'activeFrom', 'activeTo', 'severityLevel'],
  EXERCISE_BASIC: ['id', 'name', 'code', 'type'],
  EXERCISE_LIST: ['id', 'name', 'code', 'type', 'description'],
  EXERCISE_CONFIG_BASIC: ['id', 'configType', 'exerciseId'],
  EXERCISE_CONFIG_LIST: ['id', 'configType', 'exerciseId', 'settings', 'isEnabled'],
  EXAM_SESSION_BASIC: ['id', 'code', 'examType', 'status'],
  EXAM_SESSION_LIST: ['id', 'code', 'examType', 'status', 'scheduledDate', 'startedAt', 'completedAt'],
  EXAM_RESULT_BASIC: ['id', 'examType', 'status', 'leftEyeLevel', 'rightEyeLevel', 'bothEyeLevel', 'completedAt'],
  EXAM_RESULT_LIST: [
    'id',
    'examType',
    'status',
    'leftEyeLevel',
    'rightEyeLevel',
    'bothEyeLevel',
    'leftEyeAccuracy',
    'rightEyeAccuracy',
    'bothEyeAccuracy',
    'completedAt',
    'createdAt',
  ],
};

/**
 * Database-level filter helpers
 */
const FILTERS = {
  /**
   * JSONB field filter (PostgreSQL)
   * @param {string} field - JSONB field name
   * @param {string} path - JSON path
   * @param {any} value - Value to match
   */
  jsonb: (field, path, value) => {
    const { fn, col, where } = require('sequelize');
    return where(fn('jsonb_extract_path_text', col(field), path), value);
  },

  /**
   * Date range filter
   * @param {string} field - Date field name
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  dateRange: (field, startDate, endDate) => ({
    [field]: { [Op.gte]: startDate, [Op.lte]: endDate },
  }),

  /**
   * Text search filter (case-insensitive)
   * @param {string} field - Text field name
   * @param {string} searchTerm - Search term
   */
  textSearch: (field, searchTerm) => ({
    [field]: { [Op.iLike]: `%${searchTerm}%` },
  }),

  /**
   * Text search filter with unaccent support (case-insensitive, accent-insensitive)
   * Uses PostgreSQL unaccent extension for Vietnamese text search
   * @param {string} field - Text field name
   * @param {string} searchTerm - Search term
   */
  textSearchUnaccent: (field, searchTerm) => {
    const { fn, col, where } = require('sequelize');
    // Escape single quotes in search term
    const escapedTerm = searchTerm.replace(/'/g, "''");
    return where(fn('unaccent', fn('LOWER', col(field))), Op.like, fn('unaccent', fn('LOWER', `%${escapedTerm}%`)));
  },

  /**
   * Multi-tenant filter (security - always include centerId)
   * @param {number} centerId - Center ID
   */
  multiTenant: (centerId) => ({ centerId }),
};

/**
 * Query performance monitoring
 */
const monitor = {
  /**
   * Measure query performance
   * @param {string} name - Query identifier
   * @param {Function} fn - Function to measure
   */
  async measure(name, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(`Slow query: ${name} took ${duration}ms`);
      }
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Query failed', {
        queryName: name,
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },
};

module.exports = {
  FIELDS,
  buildQuery,
  buildPagination,
  sanitizePagination,
  buildSortBy,
  WHERE_CLAUSES,
  buildFilter,
  ATTRS,
  FILTERS,
  monitor,
};
