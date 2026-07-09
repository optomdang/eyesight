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

const createTreatmentPackage = {
  body: Joi.object().keys({
    name: standardString.name,
    code: standardString.code,
    durationDays: Joi.number().integer().min(1).max(3650).required(),
    exerciseConfigIds: Joi.array().items(Joi.number().integer().positive()).default([]),
    centerId: standardTenantFields.centerId,
    updatedBy: standardTenantFields.updatedBy,
  }),
};

const getTreatmentPackages = {
  query: Joi.object().keys({
    ...standardQueryParams,
    name: Joi.string().optional(),
    code: Joi.string().optional(),
    centerId: standardTenantFields.centerId.optional(),
  }),
};

const getTreatmentPackage = getEntityValidation('package');

const updateTreatmentPackage = {
  params: Joi.object().keys({
    packageId: standardId,
  }),
  body: Joi.object()
    .keys({
      name: standardString.name.optional(),
      code: standardString.code.optional(),
      durationDays: Joi.number().integer().min(1).max(3650).optional(),
      exerciseConfigIds: Joi.array().items(Joi.number().integer().positive()).optional(),
      updatedBy: standardTenantFields.updatedBy,
    })
    .min(1),
};

const deleteTreatmentPackage = deleteEntityValidation('package');
const deleteTreatmentPackages = bulkDeleteValidation;

const assignTreatmentPackage = {
  params: Joi.object().keys({
    packageId: standardId,
  }),
  body: Joi.object().keys({
    patientId: Joi.number().integer().required(),
    centerId: standardTenantFields.centerId,
    updatedBy: standardTenantFields.updatedBy,
  }),
};

module.exports = {
  createTreatmentPackage,
  getTreatmentPackages,
  getTreatmentPackage,
  updateTreatmentPackage,
  deleteTreatmentPackage,
  deleteTreatmentPackages,
  assignTreatmentPackage,
};
