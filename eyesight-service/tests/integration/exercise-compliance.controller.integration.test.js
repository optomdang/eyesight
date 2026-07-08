const request = require('supertest');
const httpStatus = require('http-status');
const { performance } = require('perf_hooks');
const { setupTestDB, cleanTables, testDataFactories } = require('../utils/setupTestDB');
const { Center, User, Patient, Exercise, ExerciseConfig, ExerciseAssignment } = require('../../src/models');

global.performance = global.performance || performance;

jest.setTimeout(30000);

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../src/config/sentry', () => ({
  initSentry: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
  errorHandlerWithContext: jest.fn(() => (err, req, res, next) => next(err)),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  Sentry: {
    init: jest.fn(),
    setupExpressErrorHandler: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    addBreadcrumb: jest.fn(),
  },
}));

jest.mock('../../src/services/system/notification.service', () => ({
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/utils/firebaseAdmin', () => ({
  messaging: () => ({
    send: jest.fn().mockResolvedValue('mock-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  }),
}));

jest.mock('../../src/middlewares/auth', () => () => (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const authState = global.__TEST_AUTH__ || {};
  req.user = {
    id: authState.userId,
    centerId: authState.centerId,
    role: { rights: ['manageExercises'] },
  };

  return next();
});

let app;

setupTestDB();
cleanTables(['ExerciseAssignments', 'ExerciseConfigs', 'Exercises', 'Patients', 'Users', 'Centers']);

beforeAll(async () => {
  app = require('../../src/app');
});

describe('Exercise Compliance Controller Integration', () => {
  let center;
  let adminUser;
  let patientUser;
  let patient;
  let exercise;
  let exerciseConfig;
  let assignment;

  beforeEach(async () => {
    const unique = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    center = await Center.create(
      testDataFactories.createCenterData({
        code: `CENTER_${unique}`,
      })
    );

    adminUser = await User.create(
      testDataFactories.createUserData(center.id, {
        email: `doctor_${unique}@test.com`,
        userType: 'doctor',
        name: 'Doctor Test',
      }),
      {
        fields: [
          'id',
          'name',
          'email',
          'phoneNumber',
          'password',
          'roleId',
          'userType',
          'isEmailVerified',
          'centerId',
          'active',
          'deleted',
        ],
        returning: false,
      }
    );

    patientUser = await User.create(
      testDataFactories.createUserData(center.id, {
        email: `patient_${unique}@test.com`,
        userType: 'patient',
        name: 'Patient Test',
      }),
      {
        fields: [
          'id',
          'name',
          'email',
          'phoneNumber',
          'password',
          'roleId',
          'userType',
          'isEmailVerified',
          'centerId',
          'active',
          'deleted',
        ],
        returning: false,
      }
    );

    patient = await Patient.create(
      testDataFactories.createPatientData(patientUser.id, center.id, {
        code: `PAT_${unique}`,
      })
    );

    exercise = await Exercise.create(
      testDataFactories.createExerciseData(center.id, {
        code: `EX_${unique}`,
      })
    );

    exerciseConfig = await ExerciseConfig.create(
      testDataFactories.createExerciseConfigData(exercise.id, center.id, {
        frequency: 'weekly',
        name: `CFG_${unique}`,
      })
    );

    assignment = await ExerciseAssignment.create(
      testDataFactories.createExerciseAssignmentData(patient.id, exerciseConfig.id, center.id, {
        assignedBy: adminUser.id,
        status: 'active',
        complianceStatus: 'on_track',
        nextDueDate: new Date('2026-03-29T00:00:00.000Z'),
        lastSessionAt: new Date('2026-03-22T00:00:00.000Z'),
        notes: 'Original note',
        notificationCount: 2,
      })
    );

    global.__TEST_AUTH__ = {
      userId: adminUser.id,
      centerId: center.id,
    };
  });

  describe('POST /api/v1/exercise-compliance/assignments/:assignmentId/pause', () => {
    it('should pause assignment through route validation controller and service', async () => {
      const response = await request(app)
        .post(`/api/v1/exercise-compliance/assignments/${assignment.id}/pause`)
        .set('Authorization', 'Bearer validtoken')
        .send({ reason: 'Need temporary break' })
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('message', 'Assignment paused successfully');
      expect(response.body.data).toMatchObject({
        id: assignment.id,
        status: 'paused',
        complianceStatus: 'paused',
        notes: 'Need temporary break',
      });
      expect(response.body.data.nextDueDate).toBeNull();

      const updatedAssignment = await ExerciseAssignment.findByPk(assignment.id);
      expect(updatedAssignment.status).toBe('paused');
      expect(updatedAssignment.complianceStatus).toBe('paused');
      expect(updatedAssignment.nextDueDate).toBeNull();
      expect(updatedAssignment.notes).toBe('Need temporary break');
    });

    it('should reject invalid assignment id in params', async () => {
      const response = await request(app)
        .post('/api/v1/exercise-compliance/assignments/not-a-number/pause')
        .set('Authorization', 'Bearer validtoken')
        .send({ reason: 'Invalid id' })
        .expect(httpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('assignmentId');
    });
  });

  describe('POST /api/v1/exercise-compliance/assignments/:assignmentId/resume', () => {
    it('should resume assignment through route validation controller and service', async () => {
      await assignment.update({
        status: 'paused',
        complianceStatus: 'paused',
        nextDueDate: null,
        notificationCount: 4,
      });

      const response = await request(app)
        .post(`/api/v1/exercise-compliance/assignments/${assignment.id}/resume`)
        .set('Authorization', 'Bearer validtoken')
        .send({})
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('message', 'Assignment resumed successfully');
      expect(response.body.data).toMatchObject({
        id: assignment.id,
        status: 'active',
        complianceStatus: 'on_track',
        notificationCount: 0,
      });
      expect(response.body.data.nextDueDate).toBeTruthy();

      const updatedAssignment = await ExerciseAssignment.findByPk(assignment.id);
      expect(updatedAssignment.status).toBe('active');
      expect(updatedAssignment.complianceStatus).toBe('on_track');
      expect(updatedAssignment.notificationCount).toBe(0);
      expect(updatedAssignment.nextDueDate).toBeTruthy();
      expect(updatedAssignment.nextDueDate.toISOString()).toBe('2026-03-29T00:00:00.000Z');
    });

    it('should return 404 when assignment does not exist', async () => {
      const missingId = 999999;

      const response = await request(app)
        .post(`/api/v1/exercise-compliance/assignments/${missingId}/resume`)
        .set('Authorization', 'Bearer validtoken')
        .send({})
        .expect(httpStatus.NOT_FOUND);

      expect(response.body.message).toBe('Bài tập được giao không tồn tại');
    });
  });
});
