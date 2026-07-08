const Joi = require('joi');

// Validation schema for notification settings - NEW STRUCTURE
const notificationSettingsSchema = Joi.object().keys({
  enabled: Joi.boolean().default(true),
  templateId: Joi.number().integer().allow(null).optional(),
  beforeDays: Joi.number().integer().min(0).max(30).default(1), // Notify before X days
  time: Joi.string()
    .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .default('09:00'), // HH:mm format
  methods: Joi.array().items(Joi.string().valid('email', 'zalo')).default(['email']),
});

const createExamAssignment = {
  body: Joi.object().keys({
    patientId: Joi.number().required(),
    examType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis').required(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').default('weekly'),
    isEnabled: Joi.boolean().default(true),
    notificationSettings: notificationSettingsSchema.optional(),
    centerId: Joi.number(),
    updatedBy: Joi.number(),
  }),
};

const getExamAssignments = {
  params: Joi.object().keys({
    patientId: Joi.number().optional(),
  }),
  query: Joi.object().keys({
    patientId: Joi.number().optional(),
    examType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis'),
    isEnabled: Joi.boolean(),
    centerId: Joi.number(),
    updatedBy: Joi.number(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getExamAssignment = {
  params: Joi.object().keys({
    patientId: Joi.number().required(),
    configId: Joi.number().required(),
  }),
};

const updateExamAssignment = {
  params: Joi.object().keys({
    patientId: Joi.number().required(),
    configId: Joi.number().required(),
  }),
  body: Joi.object()
    .keys({
      patientId: Joi.number().optional(),
      configId: Joi.number().optional(),
      examType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis'),
      frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
      isEnabled: Joi.boolean(),
      notificationSettings: notificationSettingsSchema.optional(),
      centerId: Joi.number(),
      updatedBy: Joi.number(),
    })
    .min(1),
};

const deleteExamAssignment = {
  params: Joi.object().keys({
    patientId: Joi.number().required(),
    configId: Joi.number().required(),
  }),
};

const deleteExamAssignments = {
  body: Joi.array().items(Joi.number()),
};

module.exports = {
  createExamAssignment,
  getExamAssignments,
  getExamAssignment,
  updateExamAssignment,
  deleteExamAssignment,
  deleteExamAssignments,
};
