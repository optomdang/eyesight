const Joi = require('joi');

const createNotificationTemplate = {
  body: Joi.object().keys({
    code: Joi.string().required().max(100),
    name: Joi.string().required().max(255),
    category: Joi.string().required().valid('exam', 'exercise', 'system', 'reminder'),
    subject: Joi.string().allow(null, ''),
    content: Joi.string().required(),
    variables: Joi.array().items(Joi.string()).default([]),
    isDefault: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
    centerId: Joi.number().integer().allow(null),
  }),
};

const getNotificationTemplates = {
  query: Joi.object().keys({
    code: Joi.string(),
    name: Joi.string(),
    category: Joi.string().valid('exam', 'exercise', 'system', 'reminder'),
    isDefault: Joi.boolean(),
    isActive: Joi.boolean(),
    centerId: Joi.number().integer(),
    createdBy: Joi.number().integer(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getNotificationTemplate = {
  params: Joi.object().keys({
    templateId: Joi.number().integer().required(),
  }),
};

const updateNotificationTemplate = {
  params: Joi.object().keys({
    templateId: Joi.number().integer().required(),
  }),
  body: Joi.object()
    .keys({
      code: Joi.string().max(100),
      name: Joi.string().max(255),
      category: Joi.string().valid('exam', 'exercise', 'system', 'reminder'),
      subject: Joi.string().allow(null, ''),
      content: Joi.string(),
      variables: Joi.array().items(Joi.string()),
      isDefault: Joi.boolean(),
      isActive: Joi.boolean(),
      centerId: Joi.number().integer().allow(null),
    })
    .min(1),
};

const deleteNotificationTemplate = {
  params: Joi.object().keys({
    templateId: Joi.number().integer().required(),
  }),
};

const deleteNotificationTemplates = {
  body: Joi.array().items(Joi.number().integer()).min(1).required(),
};

const renderTemplate = {
  params: Joi.object().keys({
    templateId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    variables: Joi.object().default({}),
  }),
};

const getTemplateVariables = {
  params: Joi.object().keys({
    templateId: Joi.number().integer().required(),
  }),
};

const previewTemplate = {
  params: Joi.object().keys({
    templateId: Joi.number().integer().required(),
  }),
};

const duplicateTemplate = {
  params: Joi.object().keys({
    templateId: Joi.number().integer().required(),
  }),
  body: Joi.object().keys({
    code: Joi.string().max(100),
    name: Joi.string().max(255),
    isActive: Joi.boolean(),
    centerId: Joi.number().integer().allow(null),
  }),
};

const getTemplateByCode = {
  params: Joi.object().keys({
    code: Joi.string().required(),
    type: Joi.string().required().valid('email', 'zalo', 'sms'),
  }),
  query: Joi.object().keys({
    centerId: Joi.number().integer(),
  }),
};

const getDefaultTemplate = {
  params: Joi.object().keys({
    type: Joi.string().required().valid('email', 'zalo', 'sms'),
    category: Joi.string().required().valid('exam', 'exercise', 'system', 'reminder'),
  }),
  query: Joi.object().keys({
    centerId: Joi.number().integer(),
  }),
};

module.exports = {
  createNotificationTemplate,
  getNotificationTemplates,
  getNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  deleteNotificationTemplates,
  renderTemplate,
  getTemplateVariables,
  previewTemplate,
  duplicateTemplate,
  getTemplateByCode,
  getDefaultTemplate,
};
