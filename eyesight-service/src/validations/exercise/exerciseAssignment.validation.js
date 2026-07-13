const Joi = require('joi');
const { standardId, standardString, _standardQueryParams, standardEnums } = require('../../utils/validation');

// Assign config to patients
const assignConfig = {
  params: Joi.object().keys({
    configId: standardId,
  }),
  body: Joi.object().keys({
    patientIds: Joi.array().items(standardId).required(),
    notes: Joi.string().max(500).allow('').optional(),
    priority: standardEnums.priority.default('normal'),
    templateId: Joi.number().integer().allow(null).optional(),
    visionLevel: Joi.number().integer().min(1).max(20).optional().allow(null),
    levelOverride: Joi.boolean().optional().allow(null),
    trainingEye: Joi.string().valid('right', 'left', 'both').optional().allow(null),
  }),
};

// Get assignments for a config
const getConfigAssignments = {
  params: Joi.object().keys({
    configId: standardId,
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('active', 'paused', 'completed', 'cancelled').optional(),
    patientId: Joi.number().integer().positive().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    sortBy: Joi.string().valid('assignedAt', 'startDate', 'endDate', 'status').default('assignedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// Get assignments for a patient
const getPatientAssignments = {
  params: Joi.object().keys({
    patientId: standardId,
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('active', 'paused', 'completed', 'cancelled').optional(),
    exerciseType: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    sortBy: Joi.string().valid('assignedAt', 'startDate', 'endDate', 'status').default('assignedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// Get specific assignment
const getAssignment = {
  params: Joi.object().keys({
    patientId: standardId,
    assignmentId: standardId,
  }),
};

// Update assignment - all fields optional except ID
const updateAssignment = {
  params: Joi.object().keys({
    patientId: standardId,
    assignmentId: standardId,
  }),
  body: Joi.object()
    .keys({
      id: standardId,
      status: Joi.string().valid('active', 'paused', 'completed', 'cancelled').optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      notes: standardString.optional,
      priority: standardEnums.priority.optional(),
      visionLevel: Joi.number().integer().min(1).max(20).allow(null).optional(),
      levelOverride: Joi.boolean().optional(),
      trainingEye: Joi.string().valid('right', 'left', 'both').allow(null).optional(),
      exerciseConfigId: Joi.number().integer().positive().optional(),
    })
    .min(1),
};

// Remove assignment
const removeAssignment = {
  params: Joi.object().keys({
    patientId: standardId,
    assignmentId: standardId,
  }),
};

// Record session
const recordSession = {
  params: Joi.object().keys({
    patientId: standardId,
    exerciseConfigId: standardId,
  }),
  body: Joi.object().keys({
    completedAt: Joi.date()
      .iso()
      .default(() => new Date()),
    score: Joi.number().min(0).max(100).optional(),
    duration: Joi.number().integer().positive().optional(),
    notes: standardString.optional,
  }),
};

// Get assignment statistics
const getAssignmentStats = {
  query: Joi.object().keys({
    status: Joi.string().valid('active', 'paused', 'completed', 'cancelled').optional(),
    exerciseType: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }),
};

// ==================== PORTAL VALIDATIONS ====================

// Get current user's assignments
const getMyAssignments = {
  query: Joi.object().keys({
    status: Joi.string().valid('active', 'completed', 'inactive').default('active'),
    complianceStatus: Joi.string().valid('compliant', 'overdue', 'critical').optional(),
    exerciseId: Joi.number().integer().positive().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    sortBy: Joi.string().valid('assignedAt', 'lastCompletedAt').default('assignedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// Get current user's exercise sessions with status filter
const getMyExerciseSessions = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'incomplete', 'completed', 'missed').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    sortBy: Joi.string().valid('startedAt', 'completedAt', 'createdAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// Get current user's specific assignment
const getMyAssignment = {
  params: Joi.object().keys({
    assignmentId: standardId,
  }),
};

// Get current user's assignment results
const getMyAssignmentResults = {
  params: Joi.object().keys({
    assignmentId: standardId,
  }),
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    level: Joi.number().integer().min(1).optional(),
    completed: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    sortBy: Joi.string().valid('createdAt', 'score', 'duration', 'level', 'accuracy').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// Start assignment session
const startAssignmentSession = {
  params: Joi.object().keys({
    assignmentId: standardId,
  }),
  body: Joi.object().keys({
    deviceInfo: Joi.object().optional(),
  }),
};

// Submit session result
const submitSessionResult = {
  params: Joi.object().keys({
    assignmentId: standardId,
    sessionId: standardId,
  }),
  body: Joi.object().keys({
    score: Joi.number().min(0).optional(),
    accuracy: Joi.number().min(0).max(100).optional(),
    duration: Joi.number().min(0).optional(),
    completed: Joi.boolean().required(),
    level: Joi.number().integer().min(1).optional(),
    visualSettings: Joi.object().optional(),
    metadata: Joi.object().optional(),
  }),
};

// Get current user's assignment statistics
const getMyAssignmentStats = {
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }),
};

// Get current user's assignment sessions
const getMyAssignmentSessions = {
  params: Joi.object().keys({
    assignmentId: standardId,
  }),
  query: Joi.object().keys({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    status: Joi.string().valid('incomplete', 'completed').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    sortBy: Joi.string().valid('startedAt', 'completedAt', 'status').default('startedAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// Get session progress
const getSessionProgress = {
  params: Joi.object().keys({
    assignmentId: standardId,
  }),
  query: Joi.object().keys({
    date: Joi.date().iso().optional(),
  }),
};

module.exports = {
  assignConfig,
  getConfigAssignments,
  getPatientAssignments,
  getAssignment,
  updateAssignment,
  removeAssignment,
  recordSession,
  getAssignmentStats,

  // Portal validations
  getMyAssignments,
  getMyExerciseSessions,
  getMyAssignment,
  getMyAssignmentResults,
  startAssignmentSession,
  submitSessionResult,
  getMyAssignmentStats,
  getMyAssignmentSessions,
  getSessionProgress,
};
