const Joi = require('joi');
const {
  standardId,
  standardString,
  standardQueryParams,
  standardTenantFields,
  standardEnums,
  getEntityValidation,
  deleteEntityValidation,
} = require('../../utils/validation');

// Create validation - all mandatory fields required
const createExamSession = {
  body: Joi.object().keys({
    code: standardString.code,
    patientId: standardId,
    doctorId: Joi.number().integer().positive().optional(),
    status: standardEnums.examStatus.default('incomplete'),
    scheduledDate: Joi.date().iso().min('now').optional(),
    examType: standardEnums.examType.optional(),
    startedAt: Joi.date().iso().optional(),
    endedAt: Joi.date().iso().optional(),
    completedAt: Joi.date().iso().optional(),
    notes: standardString.notes,
    deviceInfo: Joi.object().optional(),
    centerId: standardTenantFields.centerId,
    createdBy: standardTenantFields.updatedBy,
    updatedBy: standardTenantFields.updatedBy,
  }),
};

// Query validation - standard pagination and filtering
const getExamSessions = {
  query: Joi.object().keys({
    ...standardQueryParams,
    code: Joi.string().optional(),
    patientId: Joi.number().integer().positive().optional(),
    doctorId: Joi.number().integer().positive().optional(),
    status: standardEnums.examStatus.optional(),
    examType: standardEnums.examType.optional(),
    scheduledDate: Joi.date().iso().optional(),
    scheduledFrom: Joi.date().iso().optional(),
    scheduledTo: Joi.date().iso().optional(),
    centerId: Joi.number().integer().positive().optional(),
  }),
};

// Get single entity - standard ID validation
const getExamSession = getEntityValidation('session');

// Update validation - all fields optional except ID and centerId
const updateExamSession = {
  params: Joi.object().keys({
    sessionId: standardId,
  }),
  body: Joi.object()
    .keys({
      id: standardId,
      code: standardString.code,
      patientId: standardId,
      doctorId: Joi.number().integer().positive().optional(),
      status: standardEnums.examStatus.optional(),
      scheduledDate: Joi.date().iso().optional(),
      examType: standardEnums.examType.optional(),
      startedAt: Joi.date().iso().optional(),
      endedAt: Joi.date().iso().optional(),
      completedAt: Joi.date().iso().optional(),
      notes: standardString.notes,
      deviceInfo: Joi.object().optional(),
      centerId: standardTenantFields.centerId,
      updatedBy: standardTenantFields.updatedBy,
    })
    .min(1),
};

// Update status only - specific validation
const updateExamSessionStatus = {
  params: Joi.object().keys({
    sessionId: standardId,
  }),
  body: Joi.object().keys({
    status: standardEnums.examStatus.required(),
  }),
};

// Delete single entity - standard ID validation
const deleteExamSession = deleteEntityValidation('session');

module.exports = {
  createExamSession,
  getExamSessions,
  getExamSession,
  updateExamSession,
  updateExamSessionStatus,
  deleteExamSession,
};
