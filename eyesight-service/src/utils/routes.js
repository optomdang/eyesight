const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const injectData = require('../middlewares/injectData');

/**
 * Standardized middleware patterns for routes
 * Ensures consistent ordering: auth -> validate -> injectData -> controller
 */

/**
 * CRUD route middleware factory
 * @param {Object} options - Route configuration options
 * @param {string} options.right - Permission right code
 * @param {Object} options.validation - Joi validation schema
 * @param {string} options.injectTarget - Target for data injection ('body', 'query', 'params')
 * @param {Function} options.controller - Controller function
 * @returns {Array} Array of middleware functions in standard order
 */
const createMiddleware = ({ right, validation, injectTarget, controller }) => {
  const middleware = [];

  // 1. Authentication & Authorization (always first)
  if (right) {
    middleware.push(auth(right));
  }

  // 2. Request Validation (always second)
  if (validation) {
    middleware.push(validate(validation));
  }

  // 3. Data Injection (always third, if needed)
  if (injectTarget) {
    middleware.push(injectData(injectTarget));
  }

  // 4. Controller (always last)
  if (controller) {
    middleware.push(controller);
  }

  return middleware;
};

/**
 * CRUD route patterns
 * Provides consistent middleware ordering for common CRUD operations
 */
const routePatterns = {
  /**
   * CREATE route pattern (POST /)
   */
  create: ({ right, validation, controller }) =>
    createMiddleware({
      right,
      validation,
      injectTarget: 'body',
      controller,
    }),

  /**
   * READ LIST route pattern (GET /)
   */
  list: ({ right, validation, controller }) =>
    createMiddleware({
      right,
      validation,
      injectTarget: 'query',
      controller,
    }),

  /**
   * READ SINGLE route pattern (GET /:id)
   */
  get: ({ right, validation, controller }) =>
    createMiddleware({
      right,
      validation,
      injectTarget: null, // No injection needed for GET single
      controller,
    }),

  /**
   * UPDATE route pattern (PATCH /:id)
   */
  update: ({ right, validation, controller }) =>
    createMiddleware({
      right,
      validation,
      injectTarget: 'body',
      controller,
    }),

  /**
   * DELETE route pattern (DELETE /:id)
   */
  delete: ({ right, validation, controller }) =>
    createMiddleware({
      right,
      validation,
      injectTarget: 'body',
      controller,
    }),

  /**
   * BULK DELETE route pattern (DELETE /)
   */
  bulkDelete: ({ right, validation, controller }) =>
    createMiddleware({
      right,
      validation,
      injectTarget: 'body',
      controller,
    }),
};

/**
 * Parameter naming conventions
 * Ensures consistent parameter names across all routes
 */
const paramNames = {
  // Authentication domain
  userId: 'userId',
  roleId: 'roleId',

  // Clinic domain
  patientId: 'patientId',
  doctorId: 'doctorId',

  // Exam domain
  sessionId: 'sessionId',
  resultId: 'resultId',
  examResultId: 'examResultId', // Added this parameter
  metricId: 'metricId',

  // Exercise domain
  exerciseId: 'exerciseId',
  configId: 'configId',
  assignmentId: 'assignmentId',

  // System domain
  centerId: 'centerId',
  clinicId: 'clinicId',
  notificationId: 'notificationId',
  templateId: 'templateId',
  scheduleId: 'scheduleId',
};

/**
 * Nested resource patterns
 * Provides consistent patterns for parent/child relationships
 */
const nestedRoutes = {
  /**
   * Patient nested resources
   */
  patient: {
    examConfigs: '/patients/:patientId/exam-configs',
    examSessions: '/patients/:patientId/exam-sessions',
    examResults: '/patients/:patientId/exam-results',
    exerciseAssignments: '/patients/:patientId/exercise-assignments',
    exerciseResults: '/patients/:patientId/exercise-results',
  },

  /**
   * Exercise config nested resources
   */
  exerciseConfig: {
    assignments: '/exercise-configs/:configId/assignments',
  },

  /**
   * Exam session nested resources
   */
  examSession: {
    results: '/exam-sessions/:sessionId/exam-results',
  },

  /**
   * Center nested resources
   */
  center: {
    clinics: '/centers/:centerId/clinics',
    users: '/centers/:centerId/users',
  },
};

/**
 * Validates route middleware ordering
 * @param {Array} middleware - Array of middleware functions
 * @returns {Object} Validation result with isValid and issues
 */
const validateMiddlewareOrdering = (middleware) => {
  const issues = [];
  let isValid = true;

  // Check if auth middleware comes first (when present)
  const authIndex = middleware.findIndex((mw) => mw.name === 'auth' || mw.toString().includes('auth('));
  const validateIndex = middleware.findIndex((mw) => mw.name === 'validate' || mw.toString().includes('validate('));
  const injectIndex = middleware.findIndex((mw) => mw.name === 'injectData' || mw.toString().includes('injectData('));

  if (authIndex !== -1 && validateIndex !== -1 && authIndex > validateIndex) {
    issues.push('Auth middleware should come before validate middleware');
    isValid = false;
  }

  if (validateIndex !== -1 && injectIndex !== -1 && validateIndex > injectIndex) {
    issues.push('Validate middleware should come before injectData middleware');
    isValid = false;
  }

  if (authIndex !== -1 && injectIndex !== -1 && authIndex > injectIndex) {
    issues.push('Auth middleware should come before injectData middleware');
    isValid = false;
  }

  return { isValid, issues };
};

module.exports = {
  createMiddleware,
  routePatterns,
  paramNames,
  nestedRoutes,
  validateMiddlewareOrdering,
};
