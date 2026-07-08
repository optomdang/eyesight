const Joi = require('joi');
const {
  standardId,
  optionalId,
  standardString,
  standardQueryParams,
  standardTenantFields,
  getEntityValidation,
  deleteEntityValidation,
  bulkDeleteValidation,
} = require('../../utils/validation');

// Create validation - all mandatory fields required
const createExercise = {
  body: Joi.object().keys({
    name: standardString.name,
    code: standardString.code,
    description: standardString.description,
    exerciseType: Joi.string().trim().required(),
    status: Joi.string().valid('active', 'inactive').default('active'),
    defaultLevel: Joi.number().integer().min(1).max(20).optional(),
    centerId: standardTenantFields.centerId,
    updatedBy: standardTenantFields.updatedBy,
  }),
};

// Query validation - standard pagination and filtering
const getExercises = {
  query: Joi.object().keys({
    ...standardQueryParams,
    name: Joi.string().optional(),
    code: Joi.string().optional(),
    description: Joi.string().optional(),
    exerciseType: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    defaultLevel: Joi.number().integer().optional(),
    centerId: Joi.number().integer().positive().optional(),
  }),
};

// Get single entity - standard ID validation
const getExercise = getEntityValidation('exercise');

// Update validation - all fields optional except ID and centerId
const updateExercise = {
  params: Joi.object().keys({
    exerciseId: standardId,
  }),
  body: Joi.object()
    .keys({
      // ID already in URL params — body id is optional if clients send it
      id: optionalId,
      name: standardString.name.optional(),
      code: standardString.code.optional(),
      description: standardString.description,
      exerciseType: Joi.string().trim().optional(),
      status: Joi.string().valid('active', 'inactive').optional(),
      defaultLevel: Joi.number().integer().min(1).max(20).optional(),
      centerId: standardTenantFields.centerId,
      updatedBy: standardTenantFields.updatedBy,
    })
    .min(1),
};

// Delete single entity - standard ID validation
const deleteExercise = deleteEntityValidation('exercise');

// Bulk delete - standard array of IDs
const deleteExercises = bulkDeleteValidation();

module.exports = {
  createExercise,
  getExercises,
  getExercise,
  updateExercise,
  deleteExercise,
  deleteExercises,
};
