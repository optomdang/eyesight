const Joi = require('joi');
const {
  standardId,
  standardString,
  standardQueryParams,
  getEntityValidation,
  deleteEntityValidation,
  bulkDeleteValidation,
} = require('../../utils/validation');

// Create validation - all mandatory fields required
const createCenter = {
  body: Joi.object().keys({
    name: standardString.name,
    code: standardString.code,
    phoneNumber: Joi.string().optional(),
    address: standardString.optional,
    logo: standardString.optional,
    option: Joi.object().optional(),
    updatedBy: Joi.number().integer().positive().optional(),
  }),
};

// Query validation - standard pagination and filtering
const getCenters = {
  query: Joi.object().keys({
    ...standardQueryParams,
    name: Joi.string().optional(),
    code: Joi.string().optional(),
  }),
};

// Get single entity - standard ID validation
const getCenter = getEntityValidation('center');

// Update validation - all fields optional except ID
const updateCenter = {
  params: Joi.object().keys({
    centerId: standardId,
  }),
  body: Joi.object()
    .keys({
      id: Joi.any().optional(), // ID in body is optional since it's already in the URL params
      name: standardString.name,
      code: standardString.code,
      phoneNumber: Joi.string().optional(),
      address: standardString.optional,
      logo: standardString.optional,
      option: Joi.object().optional(),
      updatedBy: Joi.number().integer().positive().optional(),
    })
    .min(1),
};

// Delete single entity - standard ID validation
const deleteCenter = deleteEntityValidation('center');

// Bulk delete - standard array of IDs
const deleteCenters = bulkDeleteValidation();

module.exports = {
  createCenter,
  getCenters,
  getCenter,
  updateCenter,
  deleteCenter,
  deleteCenters,
};
