const Joi = require('joi');

/**
 * Standardized validation patterns for consistent validation schemas
 */

// Standard ID validation
const standardId = Joi.number().integer().positive().required();
const optionalId = Joi.number().integer().positive().optional();

// Standard query parameters for pagination and sorting
const standardQueryParams = {
  sortBy: Joi.string().optional(),
  order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  page: Joi.number().integer().min(1).optional(),
};

// Standard centerId and updatedBy fields (required for multi-tenant)
const standardTenantFields = {
  centerId: Joi.number().integer().positive().required(),
  updatedBy: Joi.number().integer().positive().optional(),
};

// Standard soft delete fields
const standardSoftDeleteFields = {
  active: Joi.boolean().optional(),
  deleted: Joi.boolean().optional(),
  deletedAt: Joi.date().iso().allow(null).optional(),
};

// Standard date fields
const standardDateFields = {
  createdAt: Joi.date().iso().optional(),
  updatedAt: Joi.date().iso().optional(),
};

// Standard string validations
const standardString = {
  required: Joi.string().trim().min(1).required(),
  optional: Joi.string().trim().allow('', null).optional(),
  code: Joi.string().trim().min(1).max(50).required(),
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(1000).allow('', null).optional(),
  notes: Joi.string().trim().max(5000).allow('', null).optional(),
};

// Standard email and phone validations
const standardContact = {
  email: Joi.string().email().required(),
  optionalEmail: Joi.string().email().allow('', null).optional(),
  phoneNumber: Joi.string()
    .pattern(/^0\d{9}$/)
    .required(),
  optionalPhoneNumber: Joi.string()
    .pattern(/^0\d{9}$/)
    .allow('', null)
    .optional(),
};

// Standard enum validations
const standardEnums = {
  userType: Joi.string().valid('admin', 'doctor', 'patient').required(),
  gender: Joi.string().valid('male', 'female', 'other').allow(null).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').optional(),
  eye: Joi.string().valid('left', 'right', 'both').optional(),
  examType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis').optional(),
  examStatus: Joi.string().valid('incomplete', 'completed').optional(),
  severityLevel: Joi.string().valid('normal', 'mild', 'moderate', 'severe', 'critical').allow(null).optional(),
};

/**
 * Create standardized validation schema for entity creation
 * @param {Object} entityFields - Entity-specific fields
 * @param {Object} options - Additional options
 * @returns {Object} Joi validation schema
 */
const createEntityValidation = (entityFields = {}, options = {}) => {
  const baseFields = {
    ...standardTenantFields,
    ...entityFields,
  };

  if (options.includeTimestamps) {
    Object.assign(baseFields, standardDateFields);
  }

  return {
    body: Joi.object().keys(baseFields),
  };
};

/**
 * Create standardized validation schema for entity updates
 * @param {Object} entityFields - Entity-specific fields (all optional except id)
 * @param {Object} options - Additional options
 * @returns {Object} Joi validation schema
 */
const updateEntityValidation = (entityFields = {}, options = {}) => {
  // Make all fields optional except id and centerId
  const optionalFields = {};
  Object.keys(entityFields).forEach((key) => {
    if (key === 'id') {
      optionalFields[key] = standardId;
    } else if (key === 'centerId') {
      optionalFields[key] = standardTenantFields.centerId;
    } else {
      // Make field optional by removing .required()
      const field = entityFields[key];
      if (field && typeof field.optional === 'function') {
        optionalFields[key] = field.optional();
      } else if (field && field._flags && field._flags.presence === 'required') {
        // Clone the schema and make it optional
        optionalFields[key] = field.optional();
      } else {
        optionalFields[key] = field;
      }
    }
  });

  const baseFields = {
    id: standardId,
    centerId: standardTenantFields.centerId,
    updatedBy: standardTenantFields.updatedBy,
    ...optionalFields,
  };

  if (options.includeTimestamps) {
    Object.assign(baseFields, standardDateFields);
  }

  return {
    params: Joi.object().keys({
      [`${options.entityName || 'entity'}Id`]: standardId,
    }),
    body: Joi.object().keys(baseFields).min(1),
  };
};

/**
 * Create standardized validation schema for entity queries
 * @param {Object} filterFields - Entity-specific filter fields
 * @param {Object} options - Additional options
 * @returns {Object} Joi validation schema
 */
const queryEntityValidation = (filterFields = {}, _options = {}) => {
  const baseFields = {
    ...standardQueryParams,
    centerId: optionalId,
    ...filterFields,
  };

  return {
    query: Joi.object().keys(baseFields),
  };
};

/**
 * Create standardized validation schema for getting single entity
 * @param {string} entityName - Name of the entity (e.g., 'user', 'patient')
 * @returns {Object} Joi validation schema
 */
const getEntityValidation = (entityName) => {
  return {
    params: Joi.object().keys({
      [`${entityName}Id`]: standardId,
    }),
  };
};

/**
 * Create standardized validation schema for deleting entity
 * @param {string} entityName - Name of the entity (e.g., 'user', 'patient')
 * @returns {Object} Joi validation schema
 */
const deleteEntityValidation = (entityName) => {
  return {
    params: Joi.object().keys({
      [`${entityName}Id`]: standardId,
    }),
  };
};

/**
 * Create standardized validation schema for bulk delete
 * @returns {Object} Joi validation schema
 */
const bulkDeleteValidation = () => {
  return {
    body: Joi.object().keys({
      ids: Joi.array().items(standardId).min(1).required(),
      centerId: Joi.number().integer().positive().optional(),
      updatedBy: Joi.number().integer().positive().optional(),
    }),
  };
};

module.exports = {
  // Standard field types
  standardId,
  optionalId,
  standardQueryParams,
  standardTenantFields,
  standardSoftDeleteFields,
  standardDateFields,
  standardString,
  standardContact,
  standardEnums,

  // Schema generators
  createEntityValidation,
  updateEntityValidation,
  queryEntityValidation,
  getEntityValidation,
  deleteEntityValidation,
  bulkDeleteValidation,
};
