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
const createDoctor = {
  body: Joi.object().keys({
    code: standardString.code,
    userId: standardId,
    specialization: standardString.optional,
    licenseNumber: standardString.optional,
    qualification: standardString.optional,
    clinicId: Joi.number().integer().positive().optional(),
    centerId: standardTenantFields.centerId,
    updatedBy: standardTenantFields.updatedBy,
  }),
};

// Query validation - standard pagination and filtering
const getDoctors = {
  query: Joi.object().keys({
    ...standardQueryParams,
    code: Joi.string().optional(),
    name: Joi.string().optional(),
    userId: Joi.number().integer().positive().optional(),
    specialization: Joi.string().optional(),
    clinicId: Joi.number().integer().positive().optional(),
    centerId: Joi.number().integer().positive().optional(),
  }),
};

// Get single entity - standard ID validation
const getDoctor = getEntityValidation('doctor');

// Update validation - all fields optional except ID and centerId
const updateDoctor = {
  params: Joi.object().keys({
    doctorId: standardId,
  }),
  body: Joi.object()
    .keys({
      id: standardId,
      code: standardString.code,
      userId: standardId,
      specialization: standardString.optional,
      licenseNumber: standardString.optional,
      qualification: standardString.optional,
      clinicId: Joi.number().integer().positive().optional(),
      centerId: standardTenantFields.centerId,
      updatedBy: standardTenantFields.updatedBy,
    })
    .min(1),
};

// Delete single entity - standard ID validation
const deleteDoctor = deleteEntityValidation('doctor');

// Bulk delete - standard array of IDs
const deleteDoctors = bulkDeleteValidation();

module.exports = {
  createDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  deleteDoctors,
};
