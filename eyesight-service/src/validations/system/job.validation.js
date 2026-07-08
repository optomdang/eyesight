const Joi = require('joi');

const listJobs = {
  query: Joi.object().keys({
    // No specific query validation needed
  }),
};

const runJobs = {
  query: Joi.object().keys({
    jobCode: Joi.string().optional(),
  }),
  body: Joi.object()
    .keys({
      jobCode: Joi.string().optional(),
    })
    .unknown(true),
};

const getScheduleHistory = {
  query: Joi.object().keys({
    jobCode: Joi.string().optional(),
    status: Joi.string().valid('success', 'failed', 'partial').optional(),
    userId: Joi.number().integer().optional(),
    triggeredBy: Joi.string().valid('manual', 'cron', 'api').optional(),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    page: Joi.number().integer().min(1).default(1),
    sortBy: Joi.string().valid('ranAt', 'executionTime', 'status', 'jobCode').default('ranAt'),
    order: Joi.string().valid('ASC', 'DESC').default('DESC'),
    includeUser: Joi.boolean().default(false),
  }),
};

module.exports = {
  listJobs,
  runJobs,
  getScheduleHistory,
};
