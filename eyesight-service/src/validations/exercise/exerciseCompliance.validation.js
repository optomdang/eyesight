/**
 * Exercise Compliance Validation Schemas
 * Joi validation schemas for compliance endpoints
 */

const Joi = require('joi');

const getComplianceSummary = {
  query: Joi.object().keys({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),
};

const getComplianceAnalytics = {
  query: Joi.object().keys({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),
};

const getOverdueAssignments = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(1000).optional(),
    page: Joi.number().integer().min(1).optional(),
  }),
};

const updateAllCompliance = {
  body: Joi.object().keys({
    // No specific body validation needed for bulk update
  }),
};

const sendReminders = {
  body: Joi.object().keys({
    maxNotifications: Joi.number().integer().min(1).max(10).optional().default(3),
    notificationInterval: Joi.number().integer().min(3600000).optional().default(86400000), // 1 hour to 24 hours in ms
    dryRun: Joi.boolean().optional().default(false),
  }),
};

const pauseAssignment = {
  params: Joi.object().keys({
    assignmentId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    reason: Joi.string().max(500).optional(),
  }),
};

const resumeAssignment = {
  params: Joi.object().keys({
    assignmentId: Joi.number().integer().required(),
  }),
};

const updateAssignmentCompliance = {
  params: Joi.object().keys({
    assignmentId: Joi.number().integer().required(),
  }),
};

module.exports = {
  getComplianceSummary,
  getComplianceAnalytics,
  getOverdueAssignments,
  updateAllCompliance,
  sendReminders,
  pauseAssignment,
  resumeAssignment,
  updateAssignmentCompliance,
};
