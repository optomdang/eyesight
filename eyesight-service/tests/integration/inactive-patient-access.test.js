const request = require('supertest');
const httpStatus = require('http-status');
const { setupTestDB, cleanTables, testDataFactories } = require('../utils/setupTestDB');
const { User, Patient, Doctor, Center } = require('../../src/models');

// HTTP + remote DB round-trips are slow; the default 5s is not enough.
jest.setTimeout(120000);

// Mock Firebase Admin to avoid initialization issues
jest.mock('../../src/utils/firebaseAdmin', () => ({
  messaging: () => ({
    send: jest.fn().mockResolvedValue('mock-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  }),
}));

// Mock notification service — keep the real implementation (the /notifications endpoint
// calls queryNotifications) and only stub the outbound push to avoid Firebase.
jest.mock('../../src/services/system/notification.service', () => ({
  ...jest.requireActual('../../src/services/system/notification.service'),
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

// Mock auth middleware to inject test user with role
jest.mock('../../src/middlewares/auth', () => () => (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const authState = global.__TEST_AUTH__ || {};
  req.user = {
    id: authState.userId,
    centerId: authState.centerId,
    userType: authState.userType,
    role: authState.role || { rights: ['manageOwnExercises'] },
  };

  return next();
});

let app;

setupTestDB();
cleanTables(['Patients', 'Doctors', 'Users', 'Centers']);

// Dynamic import to avoid Firebase issues
beforeAll(async () => {
  app = require('../../src/app');
});

describe('Inactive Patient Access Control Integration Tests', () => {
  let testCenter;
  let doctorUser;
  let doctorRecord;
  let inactivePatientUser;
  let inactivePatientRecord;

  // Helper to create active patient for tests
  const createActivePatient = async () => {
    const activePatientUser = await User.create(
      testDataFactories.createUserData(testCenter.id, {
        email: `active_${Date.now()}@inttest.com`,
        userType: 'patient',
        name: 'Active Patient',
      })
    );

    const _activePatientRecord = await Patient.create(
      testDataFactories.createPatientData(activePatientUser.id, testCenter.id, {
        code: `PAT_ACTIVE_${Date.now()}`,
        doctorId: doctorRecord.id,
        treatmentStatus: 'active',
      })
    );

    return { activePatientUser };
  };

  beforeEach(async () => {
    // Create test center
    testCenter = await Center.create(
      testDataFactories.createCenterData({
        code: `INT_TEST_CENTER_${Date.now()}`,
        name: 'Integration Test Center',
      })
    );

    // Create doctor user and record
    doctorUser = await User.create(
      testDataFactories.createUserData(testCenter.id, {
        email: `doctor_${Date.now()}@inttest.com`,
        userType: 'doctor',
        name: 'Dr. Integration Test',
      })
    );

    doctorRecord = await Doctor.create({
      code: `DOC_INT_${Date.now()}`,
      userId: doctorUser.id,
      centerId: testCenter.id,
      specialization: 'Ophthalmology',
    });

    // Create active patient user and record (removed - use helper instead)

    // Create inactive patient user and record
    inactivePatientUser = await User.create(
      testDataFactories.createUserData(testCenter.id, {
        email: `inactive_${Date.now()}@inttest.com`,
        userType: 'patient',
        name: 'Inactive Patient',
      })
    );

    inactivePatientRecord = await Patient.create(
      testDataFactories.createPatientData(inactivePatientUser.id, testCenter.id, {
        code: `PAT_INACTIVE_${Date.now()}`,
        doctorId: doctorRecord.id,
        treatmentStatus: 'paused', // Inactive patient (not 'active' → blocked)
      })
    );
  });

  describe('GET /v1/me/assignments - Exercise Assignments', () => {
    it('should allow active patient to access assignments', async () => {
      const { activePatientUser } = await createActivePatient();

      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/assignments')
        .set('Authorization', `Bearer activetoken`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('rows');
      expect(Array.isArray(res.body.rows)).toBe(true);
    });

    it('should block inactive patient with 403', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/assignments')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe(
        'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
      );
    });

    it('should return correct error code for inactive patient', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/assignments')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.code).toBe(httpStatus.FORBIDDEN);
    });
  });

  describe('GET /v1/me/sessions - Exercise Sessions', () => {
    it('should allow active patient to access sessions', async () => {
      const { activePatientUser } = await createActivePatient();

      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/sessions')
        .set('Authorization', `Bearer activetoken`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('rows');
    });

    it('should block inactive patient from accessing sessions', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/sessions')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toContain('liệu trình điều trị');
    });
  });

  describe('GET /v1/me/exam-sessions - Exam Sessions', () => {
    it('should allow active patient to access exam sessions', async () => {
      const { activePatientUser } = await createActivePatient();

      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/exam-sessions')
        .set('Authorization', `Bearer activetoken`)
        .expect(httpStatus.OK);

      expect(res.body).toBeDefined();
    });

    it('should block inactive patient from accessing exam sessions', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/exam-sessions')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe(
        'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
      );
    });
  });

  describe('GET /v1/me/exercise-results - Exercise Results', () => {
    it('should allow active patient to access exercise results', async () => {
      const { activePatientUser } = await createActivePatient();

      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/exercise-results')
        .set('Authorization', `Bearer activetoken`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('rows');
    });

    it('should block inactive patient from accessing exercise results', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/exercise-results')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toContain('bác sĩ');
    });
  });

  describe('GET /v1/me/exam-results - Exam Results', () => {
    it('should allow active patient to access exam results', async () => {
      const { activePatientUser } = await createActivePatient();

      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/exam-results')
        .set('Authorization', `Bearer activetoken`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('rows');
    });

    it('should block inactive patient from accessing exam results', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/exam-results')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.FORBIDDEN);

      expect(res.body.message).toBe(
        'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.'
      );
    });
  });

  describe('Profile Endpoints - Should Remain Accessible', () => {
    it('should allow inactive patient to access profile (GET /v1/me/)', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app).get('/api/v1/me/').set('Authorization', `Bearer inactivetoken`).expect(httpStatus.OK);

      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toBe(inactivePatientUser.id);
    });

    it('should allow inactive patient to access patient info (GET /v1/me/info)', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/info')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('id');
      expect(res.body.treatmentStatus).toBe('paused');
    });

    it('should allow inactive patient to access notifications', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('rows');
    });
  });

  describe('Doctor Access - Should Not Be Affected', () => {
    it('should allow doctor to access patient endpoints', async () => {
      global.__TEST_AUTH__ = {
        userId: doctorUser.id,
        centerId: testCenter.id,
        userType: 'doctor',
      };

      const res = await request(app)
        .get('/api/v1/me/patients')
        .set('Authorization', `Bearer doctortoken`)
        .expect(httpStatus.OK);

      expect(res.body).toHaveProperty('rows');
    });

    it('should not apply patient status check to doctors', async () => {
      global.__TEST_AUTH__ = {
        userId: doctorUser.id,
        centerId: testCenter.id,
        userType: 'doctor',
      };

      const res = await request(app).get('/api/v1/me/').set('Authorization', `Bearer doctortoken`).expect(httpStatus.OK);

      expect(res.body.userType).toBe('doctor');
    });
  });

  describe('Error Message Validation', () => {
    it('should return Vietnamese error message', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/assignments')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.FORBIDDEN);

      // Verify Vietnamese message
      expect(res.body.message).toMatch(/liệu trình điều trị/);
      expect(res.body.message).toMatch(/bác sĩ/);
      expect(res.body.message).toMatch(/hỗ trợ/);
    });

    it('should return consistent error message across all endpoints', async () => {
      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const expectedMessage =
        'Tài khoản của bạn hiện không trong liệu trình điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.';

      const endpoints = [
        '/api/v1/me/assignments',
        '/api/v1/me/sessions',
        '/api/v1/me/exam-sessions',
        '/api/v1/me/exercise-results',
        '/api/v1/me/exam-results',
      ];

      const testPromises = endpoints.map(async (endpoint) => {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer inactivetoken`)
          .expect(httpStatus.FORBIDDEN);

        expect(res.body.message).toBe(expectedMessage);
      });

      await Promise.all(testPromises);
    });
  });

  describe('Preservation - Active Patient Behavior', () => {
    it('should not affect active patient access to any treatment endpoint', async () => {
      const { activePatientUser } = await createActivePatient();

      global.__TEST_AUTH__ = {
        userId: activePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const endpoints = [
        '/api/v1/me/assignments',
        '/api/v1/me/sessions',
        '/api/v1/me/exam-sessions',
        '/api/v1/me/exercise-results',
        '/api/v1/me/exam-results',
      ];

      const testPromises = endpoints.map(async (endpoint) => {
        const res = await request(app).get(endpoint).set('Authorization', `Bearer activetoken`);

        // Should return 200 OK, not 403 Forbidden
        expect(res.status).toBe(httpStatus.OK);
        expect(res.body).not.toHaveProperty('message', expect.stringContaining('liệu trình'));
      });

      await Promise.all(testPromises);
    });
  });

  describe('Edge Cases', () => {
    it('should block every non-active treatmentStatus (completed/not_started)', async () => {
      // treatmentStatus is a NOT NULL enum now; only 'active' grants access.
      // Verify the other terminal/pre states are blocked too (not just 'paused').
      const blockedStatuses = ['completed', 'not_started'];

      // eslint-disable-next-line no-restricted-syntax
      for (const status of blockedStatuses) {
        // eslint-disable-next-line no-await-in-loop
        await inactivePatientRecord.update({ treatmentStatus: status });

        global.__TEST_AUTH__ = {
          userId: inactivePatientUser.id,
          centerId: testCenter.id,
          userType: 'patient',
        };

        // eslint-disable-next-line no-await-in-loop
        const res = await request(app)
          .get('/api/v1/me/assignments')
          .set('Authorization', `Bearer inactivetoken`)
          .expect(httpStatus.FORBIDDEN);

        expect(res.body.message).toContain('liệu trình điều trị');
      }
    });

    it('should handle deleted patient record', async () => {
      // Soft delete patient record
      await inactivePatientRecord.update({ deleted: true });

      global.__TEST_AUTH__ = {
        userId: inactivePatientUser.id,
        centerId: testCenter.id,
        userType: 'patient',
      };

      const res = await request(app)
        .get('/api/v1/me/assignments')
        .set('Authorization', `Bearer inactivetoken`)
        .expect(httpStatus.NOT_FOUND);

      expect(res.body.message).toBe('Thông tin bệnh nhân không tồn tại');
    });
  });
});
