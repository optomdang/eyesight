const Joi = require('joi');
const {
  standardId,
  standardString,
  standardQueryParams,
  standardTenantFields,
  getEntityValidation,
  deleteEntityValidation,
  bulkDeleteValidation,
} = require('../../utils/validation');

// Create validation - all mandatory fields required
const createRole = {
  body: Joi.object().keys({
    name: standardString.name,
    code: standardString.code,
    description: standardString.description,
    rights: Joi.array().items(Joi.string()).optional(),
    centerId: standardTenantFields.centerId,
    updatedBy: standardTenantFields.updatedBy,
  }),
};

// Query validation - standard pagination and filtering
const getRoles = {
  query: Joi.object().keys({
    ...standardQueryParams,
    name: Joi.string().optional(),
    code: Joi.string().optional(),
  }),
};

// Get single entity - standard ID validation
const getRole = getEntityValidation('role');

// Update validation - all fields optional except ID
const updateRole = {
  params: Joi.object().keys({
    roleId: standardId,
  }),
  body: Joi.object()
    .keys({
      id: standardId,
      name: standardString.name,
      code: standardString.code,
      description: standardString.description,
      rights: Joi.array().items(Joi.string()).optional(),
      centerId: standardTenantFields.centerId,
      updatedBy: standardTenantFields.updatedBy,
    })
    .min(1),
};

// Delete single entity - standard ID validation
const deleteRole = deleteEntityValidation('role');

// Bulk delete - standard array of IDs
const deleteRoles = bulkDeleteValidation();

module.exports = {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  deleteRoles,
};
