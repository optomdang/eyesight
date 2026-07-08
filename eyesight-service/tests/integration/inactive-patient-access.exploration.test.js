/**
 * Bug Condition Exploration Test - Inactive Patient Access Control
 *
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 *
 * Property 1: Fault Condition - Block Inactive Patient Treatment Access
 *
 * For any HTTP request where the authenticated user is a patient with active = false
 * AND the endpoint is a treatment-related endpoint (assignments, sessions, exam-sessions, exam-results),
 * the system SHALL return HTTP 403 with Vietnamese error message.
 *
 * EXPECTED OUTCOME: Test FAILS (this is correct - it proves the bug exists)
 *
 * Bug Condition: isBugCondition(input) where:
 *   - input.user.userType === 'patient'
 *   - input.user.patient.active === false
 *   - input.path matches treatment endpoints
 *
 * Expected Behavior: HTTP 403 with message "Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ."
 */

const request = require('supertest');
const httpStatus = require('http-status');
const { setupTestDB, cleanTables, testDataFactories } = require('../utils/setupTestDB');
const { User, Patient, Doctor, Center, ExerciseAssignment, ExerciseConfig, Exercise } = require('../../src/models');

// HTTP + remote DB round-trips are slow; the default 5s is not enough.
jest.setTimeout(120000);

// Mock notification service to avoid Firebase dependency
jest.mock('../../src/services/system/notification.service', () => ({
  ...jest.requireActual('../../src/services/system/notification.service'),
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

// Mock auth middleware to inject test user
jest.mock('../../src/middlewares/auth', () => () => (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const authState = global.__TEST_AUTH__ || {};
  req.user = {
    id: authState.userId,
    centerId: authState.centerId,
    userType: authState.userType,
  };

  return next();
});

let app;

// Setup test database
setupTestDB();
cleanTables(['ExerciseAssignments', 'ExerciseConfigs', 'Exercises', 'Patients', 'Doctors', 'Users', 'Centers']);

// Dynamic import to avoid Firebase issues
beforeAll(async () => {
  app = require('../../src/app');
});

describe('Bug Condition Exploration - Inactive Patient Access Control', () => {
  let center;
  let doctorUser;
  let doctor;
  let inactivePatientUser;
  let inactivePatient;
  let exercise;
  let exerciseConfig;
  let assignment;

  beforeEach(async () => {
    // Create test center
    center = await Center.create(
      testDataFactories.createCenterData({
        code: `TC_${Date.now()}`,
      })
    );

    // Create doctor
    doctorUser = await User.create(
      testDataFactories.createUserData(center.id, {
        email: `doctor_${Date.now()}@test.com`,
        userType: 'doctor',
        name: 'Dr. Test',
      })
    );

    doctor = await Doctor.create({
      code: `DOC_${Date.now()}`,
      userId: doctorUser.id,
      centerId: center.id,
      specialization: 'Ophthalmology',
    });

    // Create INACTIVE patient (active = false)
    inactivePatientUser = await User.create(
      testDataFactories.createUserData(center.id, {
        email: `inactive_patient_${Date.now()}@test.com`,
        userType: 'patient',
        name: 'Inactive Patient',
      })
    );

    inactivePatient = await Patient.create(
      testDataFactories.createPatientData(inactivePatientUser.id, center.id, {
        code: `IP_${Date.now()}`,
        doctorId: doctor.id,
        treatmentStatus: 'paused', // INACTIVE: access is gated by treatmentStatus !== 'active'
      })
    );

    // Create ACTIVE patient for comparison
    const activePatientUser = await User.create(
      testDataFactories.createUserData(center.id, {
        email: `active_patient_${Date.now()}@test.com`,
        userType: 'patient',
        name: 'Active Patient',
      })
    );

    const _activePatient = await Patient.create(
      testDataFactories.createPatientData(activePatientUser.id, center.id, {
        code: `AP_${Date.now()}`,
        doctorId: doctor.id,
        treatmentStatus: 'active', // ACTIVE
      })
    );

    // Create exercise + config for testing
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

    // Create assignment for inactive patient
    assignment = await ExerciseAssignment.create({
      patientId: inactivePatient.id,
      exerciseConfigId: exerciseConfig.id,
      visionLevel: 14,
      centerId: center.id,
      assignedBy: doctorUser.id,
      status: 'active',
    });
  });

  describe('Property 1: Fault Condition - Inactive Patient Treatment Access Block', () => {
    describe('Counterexample 1: GET /v1/me/assignments', () => {
      it('should block inactive patient from accessing assignments list', async () => {
        // Set auth context for inactive patient
        global.__TEST_AUTH__ = {
          userId: inactivePatientUser.id,
          centerId: center.id,
          userType: 'patient',
        };

        // EXPECTED: HTTP 403 with Vietnamese error message
        // ACTUAL (on unfixed code): HTTP 200 with assignments list
        const response = await request(app)
          .get('/api/v1/me/assignments')
          .set('Authorization', `Bearer inactivepatienttoken`)
          .expect(httpStatus.FORBIDDEN); // This will FAIL on unfixed code

        // Verify error message
        expect(response.body.message).toBe(
          'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
        );
      });
    });

    describe('Counterexample 2: POST /v1/me/assignments/:id/sessions', () => {
      it('should block inactive patient from starting exercise session', async () => {
        global.__TEST_AUTH__ = {
          userId: inactivePatientUser.id,
          centerId: center.id,
          userType: 'patient',
        };

        // EXPECTED: HTTP 403
        // ACTUAL (on unfixed code): HTTP 200 or 201 - session created
        const response = await request(app)
          .post(`/api/v1/me/assignments/${assignment.id}/sessions`)
          .set('Authorization', `Bearer inactivepatienttoken`)
          .send({
            startedAt: new Date().toISOString(),
          })
          .expect(httpStatus.FORBIDDEN); // This will FAIL on unfixed code

        expect(response.body.message).toBe(
          'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
        );
      });
    });

    describe('Counterexample 3: GET /v1/me/exam-sessions', () => {
      it('should block inactive patient from accessing exam sessions', async () => {
        global.__TEST_AUTH__ = {
          userId: inactivePatientUser.id,
          centerId: center.id,
          userType: 'patient',
        };

        // EXPECTED: HTTP 403
        // ACTUAL (on unfixed code): HTTP 200 with exam sessions list
        const response = await request(app)
          .get('/api/v1/me/exam-sessions')
          .set('Authorization', `Bearer inactivepatienttoken`)
          .expect(httpStatus.FORBIDDEN); // This will FAIL on unfixed code

        expect(response.body.message).toBe(
          'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
        );
      });
    });

    describe('Counterexample 4: POST /v1/me/exam-results', () => {
      it('should block inactive patient from submitting exam results', async () => {
        global.__TEST_AUTH__ = {
          userId: inactivePatientUser.id,
          centerId: center.id,
          userType: 'patient',
        };

        // EXPECTED: HTTP 403
        // ACTUAL (on unfixed code): HTTP 200 or 201 - result accepted
        const response = await request(app)
          .post('/api/v1/me/exam-results')
          .set('Authorization', `Bearer inactivepatienttoken`)
          .send({
            examType: 'far-vision',
            leftEye: 0.8,
            rightEye: 0.9,
            bothEye: 0.85,
          })
          .expect(httpStatus.FORBIDDEN); // This will FAIL on unfixed code

        expect(response.body.message).toBe(
          'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
        );
      });
    });

    describe('Counterexample 5: GET /v1/me/exercise-results', () => {
      it('should block inactive patient from accessing exercise results', async () => {
        global.__TEST_AUTH__ = {
          userId: inactivePatientUser.id,
          centerId: center.id,
          userType: 'patient',
        };

        // EXPECTED: HTTP 403
        // ACTUAL (on unfixed code): HTTP 200 with results list
        const response = await request(app)
          .get('/api/v1/me/exercise-results')
          .set('Authorization', `Bearer inactivepatienttoken`)
          .expect(httpStatus.FORBIDDEN); // This will FAIL on unfixed code

        expect(response.body.message).toBe(
          'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
        );
      });
    });
  });

  describe('Edge Case: Profile Access Should NOT Be Blocked', () => {
    it('should allow inactive patient to access profile endpoint', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Profile access should work for inactive patients
      // This is NOT a bug - patients should always access their profile
      const response = await request(app)
        .get('/api/v1/me/')
        .set('Authorization', `Bearer inactivepatienttoken`)
        .expect(httpStatus.OK); // This should PASS even on unfixed code

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Comparison: Active Patient Should Have Normal Access', () => {
    it('should allow active patient to access assignments', async () => {
      // Create active patient inline for this test
      const activePatientUser = await User.create(
        testDataFactories.createUserData(center.id, {
          email: `active_comparison_${Date.now()}@test.com`,
          userType: 'patient',
          name: 'Active Patient',
        })
      );

      await Patient.create(
        testDataFactories.createPatientData(activePatientUser.id, center.id, {
          code: `AP_COMP_${Date.now()}`,
          doctorId: doctor.id,
          treatmentStatus: 'active',
        })
      );

      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Active patients should have normal access
      const response = await request(app)
        .get('/api/v1/me/assignments')
        .set('Authorization', `Bearer activepatienttoken`)
        .expect(httpStatus.OK); // This should PASS

      expect(response.body).toHaveProperty('rows');
    });
  });
});
