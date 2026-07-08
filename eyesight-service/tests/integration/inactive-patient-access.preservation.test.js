/**
 * Preservation Property Tests - Inactive Patient Access Control
 *
 * IMPORTANT: Follow observation-first methodology
 * These tests capture the CURRENT behavior on UNFIXED code for non-buggy inputs
 *
 * Property 2: Preservation - Active Patient and Non-Patient Access
 *
 * For any HTTP request where:
 * - User is an active patient (active = true), OR
 * - User is a doctor/admin (non-patient), OR
 * - User is an inactive patient accessing profile endpoints
 *
 * The system SHALL process the request exactly as before (no changes to behavior)
 *
 * EXPECTED OUTCOME: Tests PASS on unfixed code (confirms baseline behavior to preserve)
 *
 * Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
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

// Faithful auth harness: mirrors src/middlewares/auth.js without a real JWT.
// - 401 when the token is missing or explicitly invalid (mirrors passport reject).
// - Loads the REAL seeded user (so the profile endpoint returns a full user incl. email).
// - Resolves role rights from the user's userType via the real roleRights config and
//   enforces the route's requiredRights (so doctor-only endpoints 403 a patient).
jest.mock('../../src/middlewares/auth', () => {
  const httpStatusInner = require('http-status');
  return (...requiredRights) =>
    async (req, res, next) => {
      try {
        const header = req.headers.authorization || '';
        if (!header || header.toLowerCase().includes('invalidtoken')) {
          return res.status(httpStatusInner.UNAUTHORIZED).send({ message: 'Please authenticate' });
        }

        const { User: UserModel } = require('../../src/models');
        const { roleRights } = require('../../src/config/roles');
        const authState = global.__TEST_AUTH__ || {};

        const dbUser = await UserModel.findByPk(authState.userId);
        if (!dbUser) {
          return res.status(httpStatusInner.UNAUTHORIZED).send({ message: 'Please authenticate' });
        }

        const userType = authState.userType ?? dbUser.userType;
        const rights = roleRights.get(userType) || [];
        req.user = {
          ...dbUser.toJSON(),
          centerId: authState.centerId ?? dbUser.centerId,
          userType,
          role: { rights },
        };

        if (requiredRights.length) {
          const hasRight = requiredRights.some((r) => rights.includes(r));
          if (!hasRight && String(req.params.userId) !== String(req.user.id)) {
            return res.status(httpStatusInner.FORBIDDEN).send({ message: 'Forbidden - Insufficient permissions' });
          }
        }

        return next();
      } catch (err) {
        return next(err);
      }
    };
});

let app;

// Setup test database
setupTestDB();
cleanTables(['ExerciseAssignments', 'ExerciseConfigs', 'Exercises', 'Patients', 'Doctors', 'Users', 'Centers']);

// Dynamic import to avoid Firebase issues
beforeAll(async () => {
  app = require('../../src/app');
});

describe('Preservation Property Tests - Active Patient and Non-Patient Access', () => {
  let center;
  let doctorUser;
  let doctor;
  let activePatientUser;
  let activePatient;
  let inactivePatientUser;
  let inactivePatient;
  let exercise;
  let exerciseConfig;
  let activeAssignment;

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

    // Create ACTIVE patient
    activePatientUser = await User.create(
      testDataFactories.createUserData(center.id, {
        email: `active_patient_${Date.now()}@test.com`,
        userType: 'patient',
        name: 'Active Patient',
      })
    );

    activePatient = await Patient.create(
      testDataFactories.createPatientData(activePatientUser.id, center.id, {
        code: `AP_${Date.now()}`,
        doctorId: doctor.id,
        treatmentStatus: 'active', // ACTIVE - should have full access
      })
    );

    // Create INACTIVE patient for profile access tests
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
        treatmentStatus: 'paused', // INACTIVE (not active → blocked)
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

    // Create assignment for active patient
    activeAssignment = await ExerciseAssignment.create({
      patientId: activePatient.id,
      exerciseConfigId: exerciseConfig.id,
      visionLevel: 14,
      centerId: center.id,
      assignedBy: doctorUser.id,
      status: 'active',
    });
  });

  describe('Property 2.1: Active Patient Treatment Access (Requirement 3.1, 3.2)', () => {
    it('should allow active patient to access GET /v1/me/assignments', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Observe current behavior: Active patients can access assignments
      const response = await request(app)
        .get('/api/v1/me/assignments')
        .set('Authorization', `Bearer activepatienttoken`)
        .expect(httpStatus.OK);

      // Verify response structure matches current behavior
      expect(response.body).toHaveProperty('rows');
      expect(Array.isArray(response.body.rows)).toBe(true);
    });

    it('should allow active patient to access GET /v1/me/assignments/:id', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      const response = await request(app)
        .get(`/api/v1/me/assignments/${activeAssignment.id}`)
        .set('Authorization', `Bearer activepatienttoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('id', activeAssignment.id);
    });

    it('should allow active patient to start exercise session POST /v1/me/assignments/:id/sessions', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Current contract: body accepts only optional deviceInfo; the start response is
      // { canStart, sessionId, sessionCode, assignment, executionNumber, totalExecutionsRequired }.
      const response = await request(app)
        .post(`/api/v1/me/assignments/${activeAssignment.id}/sessions`)
        .set('Authorization', `Bearer activepatienttoken`)
        .send({})
        .expect(httpStatus.CREATED);

      expect(response.body.canStart).toBe(true);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body.assignment).toHaveProperty('id', activeAssignment.id);
    });

    it('should allow active patient to access GET /v1/me/exam-sessions', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      const response = await request(app)
        .get('/api/v1/me/exam-sessions')
        .set('Authorization', `Bearer activepatienttoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('rows');
    });

    it('should allow active patient to access GET /v1/me/exercise-results', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      const response = await request(app)
        .get('/api/v1/me/exercise-results')
        .set('Authorization', `Bearer activepatienttoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('rows');
    });

    it('should allow active patient to access GET /v1/me/exam-dashboard', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      const response = await request(app)
        .get('/api/v1/me/exam-dashboard')
        .set('Authorization', `Bearer activepatienttoken`)
        .expect(httpStatus.OK);

      // Dashboard should return data structure
      expect(response.body).toBeDefined();
    });
  });

  describe('Property 2.2: Doctor Access Preservation (Requirement 3.3, 3.5)', () => {
    it('should allow doctor to access GET /v1/me/patients', async () => {
      global.__TEST_AUTH__ = {
        userId: doctorUser.id,
        centerId: center.id,
        userType: 'doctor',
      };

      // Doctors should be able to view their patients (including inactive ones)
      const response = await request(app)
        .get('/api/v1/me/patients')
        .set('Authorization', `Bearer doctortoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('rows');
      expect(Array.isArray(response.body.rows)).toBe(true);
    });

    it('should allow doctor to access patient details including inactive patients', async () => {
      global.__TEST_AUTH__ = {
        userId: doctorUser.id,
        centerId: center.id,
        userType: 'doctor',
      };

      // Doctor should be able to view inactive patient details
      const response = await request(app)
        .get(`/api/v1/patients/${inactivePatient.id}`)
        .set('Authorization', `Bearer doctortoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('id', inactivePatient.id);
      expect(response.body).toHaveProperty('treatmentStatus', 'paused');
    });

    it('should allow doctor to update patient status from inactive to active', async () => {
      global.__TEST_AUTH__ = {
        userId: doctorUser.id,
        centerId: center.id,
        userType: 'doctor',
      };

      // Doctor reactivates via the dedicated /resume endpoint (P4 enum design):
      // un-pausing recomputes status from the dates → 'active' (window is open).
      const response = await request(app)
        .patch(`/api/v1/patients/${inactivePatient.id}/resume`)
        .set('Authorization', `Bearer doctortoken`)
        .send({})
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('treatmentStatus', 'active');
    });
  });

  describe('Property 2.3: Profile Access for Inactive Patients (Requirement 3.6)', () => {
    it('should allow inactive patient to access GET /v1/me/ (profile)', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Profile endpoints should remain accessible to inactive patients
      const response = await request(app)
        .get('/api/v1/me/')
        .set('Authorization', `Bearer inactivepatienttoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('id', inactivePatientUser.id);
      expect(response.body).toHaveProperty('email');
    });

    it('should allow inactive patient to access GET /v1/me/info (patient info)', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      const response = await request(app)
        .get('/api/v1/me/info')
        .set('Authorization', `Bearer inactivepatienttoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('id', inactivePatient.id);
      expect(response.body).toHaveProperty('treatmentStatus', 'paused');
    });

    it('should allow inactive patient to update profile PATCH /v1/me/', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      const response = await request(app)
        .patch('/api/v1/me/')
        .set('Authorization', `Bearer inactivepatienttoken`)
        .send({
          name: 'Updated Name',
        })
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('name', 'Updated Name');
    });

    it('should allow inactive patient to access GET /v1/me/notifications', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Notification endpoints should remain accessible
      const response = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer inactivepatienttoken`)
        .expect(httpStatus.OK);

      expect(response.body).toHaveProperty('rows');
    });
  });

  describe('Property 2.4: Authentication and Authorization Preservation (Requirement 3.5)', () => {
    it('should continue to reject requests without authentication', async () => {
      // No auth header - should fail as before
      await request(app).get('/api/v1/me/assignments').expect(httpStatus.UNAUTHORIZED);
    });

    it('should continue to validate JWT tokens', async () => {
      // Invalid token - should fail as before
      await request(app)
        .get('/api/v1/me/assignments')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should continue to enforce permission checks', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Patient trying to access doctor-only endpoint - should fail as before
      await request(app).get('/api/v1/patients').set('Authorization', `Bearer patienttoken`).expect(httpStatus.FORBIDDEN);
    });
  });

  describe('Property 2.5: Error Handling Preservation (Requirement 3.6)', () => {
    it('should continue to return 404 for non-existent resources', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Non-existent assignment - should return 404 as before
      await request(app)
        .get('/api/v1/me/assignments/99999')
        .set('Authorization', `Bearer activepatienttoken`)
        .expect(httpStatus.NOT_FOUND);
    });

    it('should continue to validate request body', async () => {
      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: center.id,
        userType: 'patient',
      };

      // Session-start has no REQUIRED body fields, but typed ones are validated:
      // deviceInfo must be an object → a string is rejected with 400.
      await request(app)
        .post(`/api/v1/me/assignments/${activeAssignment.id}/sessions`)
        .set('Authorization', `Bearer activepatienttoken`)
        .send({
          deviceInfo: 'not-an-object',
        })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('Property-Based Test: Multiple Active Patients', () => {
    it('should allow all active patients to access treatment endpoints', async () => {
      // Create multiple active patients to test property holds across many inputs
      // Create 5 active patients in parallel
      const activePatientPromises = Array.from({ length: 5 }, async (_, i) => {
        const user = await User.create(
          testDataFactories.createUserData(center.id, {
            email: `active_${i}_${Date.now()}@test.com`,
            userType: 'patient',
            name: `Active Patient ${i}`,
          })
        );

        const patient = await Patient.create(
          testDataFactories.createPatientData(user.id, center.id, {
            code: `AP${i}_${Date.now()}`,
            doctorId: doctor.id,
            treatmentStatus: 'active',
          })
        );

        return { user, patient };
      });

      const activePatients = await Promise.all(activePatientPromises);

      // Test that ALL active patients can access assignments
      const testPromises = activePatients.map(async ({ user }) => {
        global.__TEST_AUTH__ = {
          userId: user.id,
          centerId: center.id,
          userType: 'patient',
        };

        const response = await request(app)
          .get('/api/v1/me/assignments')
          .set('Authorization', `Bearer token_${user.id}`)
          .expect(httpStatus.OK);

        expect(response.body).toHaveProperty('rows');
      });

      await Promise.all(testPromises);
    });
  });

  describe('Property-Based Test: Multiple Doctors', () => {
    it('should allow all doctors to access patient management endpoints', async () => {
      // Create multiple doctors in parallel
      const doctorPromises = Array.from({ length: 3 }, async (_, i) => {
        const user = await User.create(
          testDataFactories.createUserData(center.id, {
            email: `doctor_${i}_${Date.now()}@test.com`,
            userType: 'doctor',
            name: `Dr. Test ${i}`,
          })
        );

        const doc = await Doctor.create({
          code: `DOC${i}_${Date.now()}`,
          userId: user.id,
          centerId: center.id,
          specialization: 'Ophthalmology',
        });

        return { user, doctor: doc };
      });

      const doctors = await Promise.all(doctorPromises);

      // Test that ALL doctors can access patient list
      const testPromises = doctors.map(async ({ user }) => {
        global.__TEST_AUTH__ = {
          userId: user.id,
          centerId: center.id,
          userType: 'doctor',
        };

        const response = await request(app)
          .get('/api/v1/me/patients')
          .set('Authorization', `Bearer token_${user.id}`)
          .expect(httpStatus.OK);

        expect(response.body).toHaveProperty('rows');
      });

      await Promise.all(testPromises);
    });
  });
});
