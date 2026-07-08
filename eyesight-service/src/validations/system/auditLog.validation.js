const Joi = require('joi');

const getAuditLogs = {
  query: Joi.object().keys({
    action: Joi.string().max(100).optional(),
    status: Joi.string().valid('success', 'failed', 'partial').optional(),
    actorUserId: Joi.number().integer().optional(),
    actorUserType: Joi.string().valid('admin', 'doctor', 'patient').optional(),
    entityType: Joi.string().max(100).optional(),
    entityId: Joi.alternatives().try(Joi.string().max(100), Joi.number().integer()).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    includeActorUser: Joi.boolean().default(true),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('occurredAt', 'action', 'status', 'actorUserType').default('occurredAt'),
    order: Joi.string().valid('ASC', 'DESC').default('DESC'),
  }),
};

module.exports = {
  getAuditLogs,
};
