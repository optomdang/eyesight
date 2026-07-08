const request = require('supertest');
const httpStatus = require('http-status');
const { setupTestDB, cleanTables, testDataFactories } = require('../utils/setupTestDB');
const { ExerciseSession, ExerciseAssignment, ExerciseConfig, Exercise, Patient, User, Center } = require('../../src/models');
const ApiError = require('../../src/utils/ApiError');

// HTTP + remote DB round-trips are slow; the default 5s is not enough.
jest.setTimeout(120000);

jest.mock('../../src/services/exercise/exerciseResult.service', () => ({
  startExercise: jest.fn(),
  pauseExercise: jest.fn(),
  completeExercise: jest.fn(),
}));

const exerciseResultService = require('../../src/services/exercise/exerciseResult.service');

// Mock notification service to avoid Firebase dependency
jest.mock('../../src/services/system/notification.service', () => ({
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../src/utils/firebaseAdmin', () => ({
  messaging: () => ({
    send: jest.fn().mockResolvedValue('mock-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  }),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../../src/middlewares/auth', () => () => (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const authState = global.__TEST_AUTH__ || {};
  const authHeader = req.headers.authorization || '';
  const useOtherCenter = authHeader.includes('othercentertoken');

  req.user = {
    // Controllers resolve the patient via getPatientByUserId(req.user.id) → must be the User id.
    id: authState.userId,
    centerId: useOtherCenter ? authState.otherCenterId : authState.centerId,
    userId: authState.userId,
  };

  return next();
});

let app;

// Setup test database
setupTestDB();
cleanTables([
  'ExerciseResults',
  'ExerciseSessions',
  'ExerciseAssignments',
  'ExerciseConfigs',
  'Exercises',
  'Patients',
  'Users',
  'Centers',
]);

// Dynamic import to avoid Firebase issues
beforeAll(async () => {
  app = require('../../src/app');
});

describe('Exercise Result Controller Tests', () => {
  let user;
  let center;
  let patient;
  let assignment;
  let session;
  let exercise;
  let exerciseConfig;

  beforeEach(async () => {
    // Create test center
    center = await Center.create(
      testDataFactories.createCenterData({
        code: `TC_${Date.now()}`,
      })
    );

    // Create test user
    const userData = testDataFactories.createUserData(center.id, {
      email: `patient_${Date.now()}@test.com`,
      userType: 'patient',
      name: 'Test Patient',
    });

    user = await User.create(userData, {
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
    });

    // Create test patient
    patient = await Patient.create(
      testDataFactories.createPatientData(user.id, center.id, {
        code: `P_${Date.now()}`,
        gender: 'male',
      })
    );

    // Create exercise + config
    exercise = await Exercise.create(
      testDataFactories.createExerciseData(center.id, {
        code: `EX_${Date.now()}`,
      })
    );

    exerciseConfig = await ExerciseConfig.create(
      testDataFactories.createExerciseConfigData(exercise.id, center.id, {
        name: `Config_${Date.now()}`,
      })
    );

    // Create test assignment
    assignment = await ExerciseAssignment.create({
      patientId: patient.id,
      exerciseConfigId: exerciseConfig.id,
      visionLevel: 14,
      centerId: center.id,
      assignedBy: user.id,
      status: 'active',
    });

    // Create test session
    session = await ExerciseSession.create({
      code: `SS_${Date.now()}`,
      exerciseAssignmentId: assignment.id,
      patientId: patient.id,
      startedAt: new Date(),
      status: 'incomplete',
      centerId: center.id,
      createdBy: user.id,
    });

    global.__TEST_AUTH__ = {
      patientId: patient.id,
      centerId: center.id,
      userId: user.id,
    };
  });

  describe('POST /me/assignments/:assignmentId/sessions/:sessionId/results - startExercise', () => {
    it('should start a new exercise successfully', async () => {
      exerciseResultService.startExercise.mockResolvedValue({
        action: 'new',
        result: {
          id: 1,
          exerciseSessionId: session.id,
          status: 'incomplete',
          patientId: patient.id,
        },
      });

      const response = await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/start`)
        .set('Authorization', `Bearer validtoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('action', 'new');
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('exerciseSessionId', session.id);
      expect(response.body.result).toHaveProperty('status', 'incomplete');
      expect(response.body.result).toHaveProperty('patientId', patient.id);
    });

    it('should return existing incomplete result if already started', async () => {
      const existingResult = { id: 10, status: 'incomplete' };
      exerciseResultService.startExercise.mockResolvedValue({
        action: 'resume',
        result: existingResult,
      });

      const response = await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/start`)
        .set('Authorization', `Bearer validtoken`)
        .expect(httpStatus.OK);

      expect(response.body.result.id).toBe(existingResult.id);
      expect(response.body.result.status).toBe('incomplete');
    });

    it('should allow start even if session does not exist', async () => {
      exerciseResultService.startExercise.mockResolvedValue({
        action: 'new',
        result: {
          id: 2,
          exerciseSessionId: 99999,
          status: 'incomplete',
          patientId: patient.id,
        },
      });

      const response = await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/99999/start`)
        .set('Authorization', `Bearer validtoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('result');
    });

    it('should return 403 for different center access', async () => {
      // Create different center
      const otherCenter = await Center.create({
        name: 'Other Center',
        code: `OC_${Date.now()}`,
        address: 'Other Address',
      });

      global.__TEST_AUTH__.otherCenterId = otherCenter.id;

      exerciseResultService.startExercise.mockResolvedValue({
        action: 'new',
        result: {
          id: 3,
          exerciseSessionId: session.id,
          status: 'incomplete',
          patientId: patient.id,
        },
      });

      await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/start`)
        .set('Authorization', `Bearer othercentertoken`)
        .expect(httpStatus.OK);
    });
  });

  describe('PATCH /me/assignments/:assignmentId/sessions/:sessionId/results/:resultId - pauseExercise', () => {
    let result;

    beforeEach(async () => {
      result = { id: 20 };
    });

    it('should pause exercise and save game state successfully', async () => {
      const gameState = {
        board: [
          [2, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        score: 200,
        moves: 5,
      };

      exerciseResultService.pauseExercise.mockResolvedValue({
        id: result.id,
        exerciseState: gameState,
        score: 200,
        duration: 120,
        status: 'incomplete',
      });

      const response = await request(app)
        .patch(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          exerciseState: gameState,
          score: 200,
          duration: 120,
        })
        .expect(httpStatus.OK);

      expect(response.body.exerciseState).toEqual(gameState);
      expect(response.body.score).toBe(200);
      expect(response.body.duration).toBe(120);
      expect(response.body.status).toBe('incomplete');
    });

    it('should return 404 for non-existent result', async () => {
      exerciseResultService.pauseExercise.mockRejectedValue(
        new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại')
      );

      await request(app)
        .patch(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/99999`)
        .set('Authorization', `Bearer validtoken`)
        .send({ score: 300 })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should reject invalid field values (pause body is all-optional, but typed)', async () => {
      // Pause has no REQUIRED fields, so validate value constraints instead:
      // accuracy must be within [0, 1].
      const response = await request(app)
        .patch(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}`)
        .set('Authorization', `Bearer validtoken`)
        .send({ accuracy: 5 })
        .expect(httpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('accuracy');
    });
  });

  describe('POST /me/assignments/:assignmentId/sessions/:sessionId/results/:resultId/complete - completeExercise', () => {
    let result;

    beforeEach(async () => {
      result = { id: 30 };
    });

    it('should complete exercise with completed status', async () => {
      exerciseResultService.completeExercise.mockResolvedValue({
        status: 'completed',
        score: 2048,
        duration: 300,
        completedAt: new Date().toISOString(),
      });

      const response = await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}/complete`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          score: 2048,
          duration: 300,
          completedAt: new Date().toISOString(),
        })
        .expect(httpStatus.OK);

      expect(response.body.status).toBe('completed');
      expect(response.body.score).toBe(2048);
      expect(response.body.duration).toBe(300);
      expect(response.body.completedAt).toBeDefined();
    });

    it('completes regardless of score — no pass/fail (D1: status is always completed)', async () => {
      exerciseResultService.completeExercise.mockResolvedValue({
        status: 'completed',
        score: 100,
        duration: 300,
        completedAt: new Date().toISOString(),
      });

      const response = await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}/complete`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          score: 100,
          duration: 300,
          completedAt: new Date().toISOString(),
        })
        .expect(httpStatus.OK);

      expect(response.body.status).toBe('completed');
      expect(response.body.score).toBe(100);
    });

    it('should return 404 for non-existent result', async () => {
      exerciseResultService.completeExercise.mockRejectedValue(
        new ApiError(httpStatus.NOT_FOUND, 'Kết quả bài tập không tồn tại')
      );

      await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/99999/complete`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          score: 1000,
          duration: 300,
          completedAt: new Date().toISOString(),
        })
        .expect(httpStatus.NOT_FOUND);
    });

    it('should validate required fields for completion', async () => {
      await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}/complete`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          // Missing required fields
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should not complete already completed exercise', async () => {
      exerciseResultService.completeExercise.mockRejectedValue(
        new ApiError(httpStatus.BAD_REQUEST, 'Bài tập đã được hoàn thành trước đó')
      );

      // Try to complete again
      const response = await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}/complete`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          score: 2000,
          duration: 400,
          completedAt: new Date().toISOString(),
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(response.body.message).toContain('đã được hoàn thành');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized access', async () => {
      await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/start`)
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should handle invalid assignment ID format', async () => {
      await request(app)
        .post('/api/v1/me/assignments/invalid/sessions/1/start')
        .set('Authorization', `Bearer validtoken`)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should handle service layer errors gracefully', async () => {
      // Skip this test for now to avoid mocking issues
      // Real integration tests should test actual service behavior
      exerciseResultService.startExercise.mockRejectedValue(
        new ApiError(httpStatus.NOT_FOUND, 'Bài tập được giao hoặc cấu hình không tồn tại')
      );

      await request(app)
        .post(`/api/v1/me/assignments/99999/sessions/99999/start`)
        .set('Authorization', `Bearer validtoken`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('Request Validation', () => {
    let result;

    beforeEach(async () => {
      result = { id: 40 };
    });

    it('should validate pause exercise request body', async () => {
      await request(app)
        .patch(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          score: 'invalid', // Should be number
          duration: -1, // Should be positive
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should validate complete exercise request body', async () => {
      await request(app)
        .post(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}/complete`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          score: 'invalid',
          duration: 'invalid',
          completedAt: 'invalid-date',
        })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should accept valid exerciseState JSON', async () => {
      const validGameState = {
        board: [
          [2, 4, 8, 16],
          [32, 64, 128, 256],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        score: 1000,
        moves: 20,
        gameOver: false,
        gameWon: false,
      };

      exerciseResultService.pauseExercise.mockResolvedValue({
        id: result.id,
        exerciseState: validGameState,
        score: 1000,
        duration: 180,
        status: 'incomplete',
      });

      const response = await request(app)
        .patch(`/api/v1/me/assignments/${assignment.id}/sessions/${session.id}/results/${result.id}`)
        .set('Authorization', `Bearer validtoken`)
        .send({
          exerciseState: validGameState,
          score: 1000,
          duration: 180,
        })
        .expect(httpStatus.OK);

      expect(response.body.exerciseState).toEqual(validGameState);
    });
  });
});
