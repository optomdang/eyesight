const Joi = require('joi');

// ============================================
// NEW VALIDATIONS: Start, Pause, Complete
// ============================================

/**
 * Start exercise - no body needed, backend gets config
 */
const startExercise = {
  params: Joi.object().keys({
    assignmentId: Joi.number().required(),
    sessionId: Joi.number().required(),
  }),
};

/**
 * Pause exercise - save current game state
 */
const pauseExercise = {
  params: Joi.object().keys({
    assignmentId: Joi.number().required(),
    sessionId: Joi.number().required(),
    resultId: Joi.number().required(),
  }),
  body: Joi.object().keys({
    exerciseState: Joi.object().optional(),
    score: Joi.number().integer().optional(),
    duration: Joi.number().integer().optional(),
    movesCount: Joi.number().integer().optional(),
    accuracy: Joi.number().min(0).max(1).optional(),
  }),
};

/**
 * Track inactivity event - no body needed
 */
const trackInactivity = {
  params: Joi.object().keys({
    assignmentId: Joi.number().required(),
    sessionId: Joi.number().required(),
    resultId: Joi.number().required(),
  }),
};

/**
 * Complete exercise - final metrics for evaluation
 */
const completeExercise = {
  params: Joi.object().keys({
    assignmentId: Joi.number().required(),
    sessionId: Joi.number().required(),
    resultId: Joi.number().required(),
  }),
  body: Joi.object().keys({
    score: Joi.number().integer().required(),
    duration: Joi.number().integer().required(),
    movesCount: Joi.number().integer().optional(),
    accuracy: Joi.number().min(0).max(1).optional(),
    // Accepted but the authoritative completion time is set server-side in completeExercise().
    completedAt: Joi.date().optional(),
    // VT Quest clinical results — persisted permanently alongside the result record.
    resultMetrics: Joi.object().optional(),
  }),
};

// ============================================
// EXISTING VALIDATIONS (updated for new status field)
// ============================================

const createExerciseResult = {
  body: Joi.object().keys({
    level: Joi.number().integer().optional(),
    score: Joi.number().integer().optional(),
    duration: Joi.number().integer().optional(),
    accuracy: Joi.number().min(0).max(1).optional(),
    status: Joi.string().valid('incomplete', 'completed').optional(),
    movesCount: Joi.number().integer().optional(),
    exerciseState: Joi.object().optional(),
    exerciseConfig: Joi.object().optional(),
    visualSettings: Joi.object().optional(),
    startedAt: Joi.date().optional(),
    completedAt: Joi.date().optional(),
  }),
};

const getExerciseResults = {
  query: Joi.object().keys({
    code: Joi.string(),
    assignmentId: Joi.number(),
    status: Joi.string().valid('incomplete', 'completed'),
    score: Joi.number().integer(),
    centerId: Joi.number(),
    updatedBy: Joi.number(),
    sortBy: Joi.string(),
    order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc'),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getExerciseResult = {
  params: Joi.object().keys({
    resultId: Joi.number(),
  }),
};

const updateExerciseResult = {
  params: Joi.object().keys({
    resultId: Joi.number().required(),
  }),
  body: Joi.object()
    .keys({
      score: Joi.number().integer(),
      duration: Joi.number().integer(),
      movesCount: Joi.number().integer(),
      accuracy: Joi.number().min(0).max(1),
      exerciseState: Joi.object(),
      status: Joi.string().valid('incomplete', 'completed'),
      completedAt: Joi.date(),
      updatedBy: Joi.number(),
    })
    .min(1),
};

const deleteExerciseResult = {
  params: Joi.object().keys({
    resultId: Joi.number(),
  }),
};

const deleteExerciseResults = {
  body: Joi.array().items(Joi.number()),
};

module.exports = {
  // New validations
  startExercise,
  pauseExercise,
  trackInactivity,
  completeExercise,
  // Existing validations
  createExerciseResult,
  getExerciseResults,
  getExerciseResult,
  updateExerciseResult,
  deleteExerciseResult,
  deleteExerciseResults,
};
