const Joi = require('joi');
const {
  standardId,
  standardString,
  standardContact,
  standardQueryParams,
  standardTenantFields,
  getEntityValidation,
  deleteEntityValidation,
  bulkDeleteValidation,
} = require('../../utils/validation');

// Create validation - centerId and updatedBy injected by middleware
const createClinic = {
  body: Joi.object().keys({
    name: standardString.name,
    code: standardString.code,
    phoneNumber: standardContact.optionalPhoneNumber,
    email: standardContact.optionalEmail,
    address: standardString.optional,
    centerId: standardTenantFields.centerId.optional(),
    updatedBy: standardTenantFields.updatedBy.optional(),
    id: Joi.forbidden(), // ID should not be provided for create
  }),
};

// Query validation - standard pagination and filtering
const getClinics = {
  query: Joi.object().keys({
    ...standardQueryParams,
    name: Joi.string().optional(),
    code: Joi.string().optional(),
    centerId: Joi.number().integer().positive().optional(),
    phoneNumber: Joi.string().optional(),
    email: Joi.string().email().optional(),
    address: Joi.string().optional(),
  }),
};

// Get single entity - standard ID validation
const getClinic = getEntityValidation('clinic');

// Update validation - all fields optional
const updateClinic = {
  params: Joi.object().keys({
    clinicId: standardId,
  }),
  body: Joi.object()
    .keys({
      name: standardString.name,
      code: standardString.code,
      phoneNumber: standardContact.optionalPhoneNumber,
      email: standardContact.optionalEmail,
      address: standardString.optional,
      centerId: standardTenantFields.centerId.optional(),
      updatedBy: standardTenantFields.updatedBy.optional(),
    })
    .min(1),
};

// Delete single entity - standard ID validation
const deleteClinic = deleteEntityValidation('clinic');

// Bulk delete - standard array of IDs
const deleteClinics = bulkDeleteValidation();

module.exports = {
  createClinic,
  getClinics,
  getClinic,
  updateClinic,
  deleteClinic,
  deleteClinics,
};
