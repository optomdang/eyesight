const Joi = require('joi');
const {
  standardId,
  standardString,
  standardQueryParams,
  standardTenantFields,
  standardEnums,
  _getEntityValidation,
  _deleteEntityValidation,
} = require('../../utils/validation');

// Create exam result for current user
const createMyExamResult = {
  body: Joi.object().keys({
    examType: standardEnums.examType.required(),
  }),
};

// Get exam results for current user
const getMyExamResults = {
  query: Joi.object().keys({
    examType: standardEnums.examType.optional(),
    status: standardEnums.examStatus.optional(),
    examSessionId: Joi.number().integer().positive().optional(),
    sortBy: Joi.string().optional(),
    order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').optional(),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    page: Joi.number().integer().min(1).default(1),
  }),
};

// Update exam result for current user
const updateMyExamResult = {
  params: Joi.object().keys({
    examResultId: standardId,
  }),
  body: Joi.object()
    .keys({
      status: Joi.string().valid('incomplete', 'completed').optional(),
      examType: standardEnums.examType.optional(),
      charType: Joi.string().optional(),
      accuracy: Joi.number().min(0).max(100).optional(),
      leftEyeLevel: Joi.number().integer().optional(),
      rightEyeLevel: Joi.number().integer().optional(),
      bothEyeLevel: Joi.number().integer().optional(),
      leftEyeAccuracy: Joi.number().min(0).max(100).optional(),
      rightEyeAccuracy: Joi.number().min(0).max(100).optional(),
      bothEyeAccuracy: Joi.number().min(0).max(100).optional(),
      rawData: Joi.object().optional(),
      distance: Joi.number().min(0.1).max(100).optional(), // Increased from 10 to 100 meters
      startedAt: Joi.date().iso().optional(),
      completedAt: Joi.date().iso().optional(),
      notes: standardString.notes,
    })
    .min(1),
};

// Get exam dashboard for current user
const getMyExamDashboard = {
  query: Joi.object().keys({
    // No specific query params needed - uses authenticated user
  }),
};

// Get exam results for specific patient
const getExamAssignmentResults = {
  params: Joi.object().keys({
    patientId: standardId,
  }),
  query: Joi.object().keys({
    examType: standardEnums.examType.optional(),
    status: standardEnums.examStatus.optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    page: Joi.number().integer().min(1).default(1),
  }),
};

// Create exam result - all mandatory fields required
const createExamResult = {
  body: Joi.object().keys({
    code: standardString.code,
    patientId: standardId,
    examType: standardEnums.examType.required(),
    status: standardEnums.examStatus.default('incomplete'),
    result: Joi.object().optional(),
    rawData: Joi.object().optional(),
    distance: Joi.number().min(0.1).max(100).optional(), // Increased from 10 to 100 meters
    bothEye: Joi.object().optional(),
    rightEye: Joi.object().optional(),
    leftEye: Joi.object().optional(),
    centerId: standardTenantFields.centerId,
  }),
};

// Get latest exam result for patient
const getLatestExamAssignmentResult = {
  params: Joi.object().keys({
    patientId: standardId,
  }),
};

// Get specific exam result (nested under patient: /patients/:patientId/exam-results/:resultId)
const getExamResult = {
  params: Joi.object().keys({
    patientId: standardId,
    resultId: standardId,
  }),
};

// Get specific exam result by ID only (standalone: /exam-results/:resultId)
const getExamResultById = {
  params: Joi.object().keys({
    resultId: standardId,
  }),
};

// Update exam result - all fields optional except ID
const updateExamResult = {
  params: Joi.object().keys({
    resultId: standardId,
  }),
  body: Joi.object()
    .keys({
      id: standardId.optional(),
      status: standardEnums.examStatus.optional(),
      result: Joi.object().optional(),
      rawData: Joi.object().optional(),
      distance: Joi.number().min(0.1).max(100).optional(), // Increased from 10 to 100 meters
      bothEye: Joi.object().optional(),
      rightEye: Joi.object().optional(),
      leftEye: Joi.object().optional(),
    })
    .min(1),
};

// Delete exam result
const deleteExamResult = {
  params: Joi.object().keys({
    resultId: standardId,
  }),
};

// Query exam results - standard pagination and filtering
const getExamResults = {
  query: Joi.object().keys({
    ...standardQueryParams,
    examType: standardEnums.examType.optional(),
    status: standardEnums.examStatus.optional(),
    patientId: Joi.number().integer().positive().optional(),
    centerId: Joi.number().integer().positive().optional(),
  }),
};

// Bulk delete exam results
const deleteExamResults = {
  body: Joi.array().items(standardId).min(1).required(),
};

module.exports = {
  createMyExamResult,
  getMyExamResults,
  updateMyExamResult,
  getMyExamDashboard,
  getExamAssignmentResults,
  createExamResult,
  getLatestExamAssignmentResult,
  getExamResult,
  getExamResultById,
  updateExamResult,
  deleteExamResult,
  getExamResults,
  deleteExamResults,
};
