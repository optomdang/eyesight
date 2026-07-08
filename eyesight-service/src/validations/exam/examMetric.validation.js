const Joi = require('joi');

const createExamMetric = {
  body: Joi.object().keys({
    examResultId: Joi.number().integer().required(),
    examSessionId: Joi.number().integer().required(),
    patientId: Joi.number().integer().required(),
    examType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis').required(),
    totalScore: Joi.string(),
    numericScore: Joi.number(),
    rightEyeLevel: Joi.string(),
    leftEyeLevel: Joi.string(),
    averageResponseTime: Joi.number().integer(),
    correctAnswersCount: Joi.number().integer(),
    totalQuestionsCount: Joi.number().integer(),
    contrastSensitivity: Joi.number(),
    stereopsisLevel: Joi.number().integer(),
    previousScore: Joi.string(),
    scoreChange: Joi.number(),
    additionalMetrics: Joi.object(),
    centerId: Joi.number().integer().required(),
  }),
};

const getExamMetrics = {
  query: Joi.object().keys({
    examResultId: Joi.number().integer(),
    examSessionId: Joi.number().integer(),
    patientId: Joi.number().integer(),
    examType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis'),
    centerId: Joi.number().integer(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getExamMetric = {
  params: Joi.object().keys({
    metricId: Joi.number().integer().required(),
  }),
};

const getExamMetricsByExamResult = {
  params: Joi.object().keys({
    examResultId: Joi.number().integer().required(),
  }),
};

const updateExamMetric = {
  params: Joi.object().keys({
    metricId: Joi.number().integer().required(),
  }),
  body: Joi.object()
    .keys({
      examResultId: Joi.number().integer(),
      examSessionId: Joi.number().integer(),
      patientId: Joi.number().integer(),
      examType: Joi.string().valid('far', 'near', 'contrast', 'stereopsis'),
      totalScore: Joi.string(),
      numericScore: Joi.number(),
      rightEyeLevel: Joi.string(),
      leftEyeLevel: Joi.string(),
      averageResponseTime: Joi.number().integer(),
      correctAnswersCount: Joi.number().integer(),
      totalQuestionsCount: Joi.number().integer(),
      contrastSensitivity: Joi.number(),
      stereopsisLevel: Joi.number().integer(),
      previousScore: Joi.string(),
      scoreChange: Joi.number(),
      additionalMetrics: Joi.object(),
      centerId: Joi.number().integer(),
    })
    .min(1),
};

const deleteExamMetric = {
  params: Joi.object().keys({
    metricId: Joi.number().integer().required(),
  }),
};

module.exports = {
  createExamMetric,
  getExamMetrics,
  getExamMetric,
  getExamMetricsByExamResult,
  updateExamMetric,
  deleteExamMetric,
};
