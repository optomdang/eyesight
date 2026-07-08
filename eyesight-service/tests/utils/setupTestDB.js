/**
 * Test Database Setup Utilities
 * Provides helpers for integration tests with real database operations
 */

const { sequelize } = require('../../src/models');

/**
 * Setup test database connection
 * Call in beforeAll()
 */
const setupTestDB = () => {
  beforeAll(async () => {
    // Ensure we're in test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Integration tests must run in test environment');
    }

    // Sync database (create tables if not exist)
    await sequelize.sync({ force: false });
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });
};

/**
 * Clean specific tables before each test
 * @param {string[]} tableNames - Array of table names to clean
 */
const cleanTables = (tableNames) => {
  beforeEach(async () => {
    for (const tableName of tableNames) {
      // Delete in the caller-provided order so child tables are cleared before parents.
      // Running these in parallel is nondeterministic with foreign keys and can leave test rows behind.
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(`DELETE FROM "${tableName}" WHERE id > 1000`, {
        type: sequelize.QueryTypes.DELETE,
      });
    }
  });
};

/**
 * Generate a unique test ID.
 *
 * Seeds the counter from a per-process, per-worker high base so that:
 *  - concurrent jest workers (parallel test files) never collide on the same shared DB, and
 *  - a crashed run that leaves rows behind cannot collide with the next run (fresh base each time).
 * All generated ids are > 1000, so cleanTables() (DELETE WHERE id > 1000) still removes them.
 * Base stays well below the 2_000_000_000 range used by the high-offset dashboard tests.
 */
const generateTestId = () => {
  if (!global.__EYESIGHT_TEST_ID_COUNTER__) {
    const workerId = parseInt(process.env.JEST_WORKER_ID || '1', 10);
    // worker lane (100M apart) + time jitter (unique per process start) → distinct base per run/worker.
    const base = 1000000 + workerId * 100000000 + (Date.now() % 100000000);
    global.__EYESIGHT_TEST_ID_COUNTER__ = base;
  }

  global.__EYESIGHT_TEST_ID_COUNTER__ += 1;
  return global.__EYESIGHT_TEST_ID_COUNTER__;
};

/**
 * Create test data factories
 */
const testDataFactories = {
  /**
   * Create test center data
   */
  createCenterData: (overrides = {}) => ({
    id: generateTestId(),
    code: `TEST_CENTER_${Date.now()}`,
    name: 'Test Center',
    active: true,
    deleted: false,
    ...overrides,
  }),

  /**
   * Create test user data.
   * email + phoneNumber are derived from the unique id (not Date.now()) so that
   * bulk creation in a tight Promise.all loop cannot collide within the same millisecond.
   */
  createUserData: (centerId, overrides = {}) => {
    const uid = generateTestId();
    return {
      id: uid,
      email: `test_${uid}@test.com`,
      password: '$2a$08$test_hashed_password',
      name: 'Test User',
      phoneNumber: `09${String(uid).padStart(8, '0').slice(-8)}`,
      userType: 'patient',
      centerId,
      roleId: 1,
      isEmailVerified: true,
      active: true,
      deleted: false,
      ...overrides,
    };
  },

  /**
   * Create test patient data
   */
  createPatientData: (userId, centerId, overrides = {}) => ({
    id: generateTestId(),
    code: `PAT_${Date.now()}`,
    userId,
    centerId,
    treatmentStatus: 'active',
    activeFrom: new Date(),
    activeTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    deleted: false,
    compliance: {
      far: { performanceRate: 0, status: 'poor', completedExams: 0, requiredExams: 0 },
      near: { performanceRate: 0, status: 'poor', completedExams: 0, requiredExams: 0 },
      contrast: { performanceRate: 0, status: 'poor', completedExams: 0, requiredExams: 0 },
      stereopsis: { performanceRate: 0, status: 'poor', completedExams: 0, requiredExams: 0 },
    },
    examResults: {
      far: { initialResult: {}, currentResult: {}, lastExamDate: null },
      near: { initialResult: {}, currentResult: {}, lastExamDate: null },
      contrast: { initialResult: {}, currentResult: {}, lastExamDate: null },
      stereopsis: { initialResult: {}, currentResult: {}, lastExamDate: null },
    },
    ...overrides,
  }),

  /**
   * Create test exercise data
   */
  createExerciseData: (centerId, overrides = {}) => ({
    id: generateTestId(),
    code: `EX_${Date.now()}`,
    name: 'Test Exercise 2048',
    exerciseType: '2048',
    centerId,
    active: true,
    deleted: false,
    ...overrides,
  }),

  /**
   * Create test exercise config data
   */
  createExerciseConfigData: (exerciseId, centerId, overrides = {}) => ({
    id: generateTestId(),
    exerciseId,
    configType: 'system',
    name: 'Test Config',
    eye: 'both',
    distance: 0.5,
    duration: 15, // 15 minutes
    frequency: 'daily',
    executionCount: 3,
    fontSize: 24,
    contrast: 80,
    visionType: 'far',
    centerId,
    deleted: false,
    ...overrides,
  }),

  /**
   * Create test exercise assignment data
   */
  createExerciseAssignmentData: (patientId, exerciseConfigId, centerId, overrides = {}) => ({
    id: generateTestId(),
    patientId,
    exerciseConfigId,
    assignedBy: 1,
    status: 'active',
    complianceStatus: 'on_track',
    sessionsCompleted: 0,
    currentLevel: 1,
    visionLevel: 10,
    centerId,
    ...overrides,
  }),

  /**
   * Create test exam assignment data
   */
  createExamAssignmentData: (patientId, centerId, overrides = {}) => ({
    id: generateTestId(),
    patientId,
    examType: 'far',
    frequency: 'weekly',
    isEnabled: true,
    centerId,
    ...overrides,
  }),
};

module.exports = {
  setupTestDB,
  cleanTables,
  generateTestId,
  testDataFactories,
  sequelize,
};
