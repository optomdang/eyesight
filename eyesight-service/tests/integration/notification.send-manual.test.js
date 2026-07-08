/**
 * POST /api/v1/notifications/send-manual — validation + authorization.
 *
 * Rewritten to the current test conventions (factories + faithful auth harness +
 * mocked outbound send). Covers the Joi contract (xor patientId/patientIds,
 * required channel, templateId-or-content) and the manageNotifications permission gate.
 */

const request = require('supertest');
const httpStatus = require('http-status');
const { setupTestDB, cleanTables, testDataFactories } = require('../utils/setupTestDB');
const { User, Patient, Center } = require('../../src/models');

// HTTP + remote DB round-trips are slow; the default 5s is not enough.
jest.setTimeout(120000);

jest.mock('../../src/utils/firebaseAdmin', () => ({
  messaging: () => ({
    send: jest.fn().mockResolvedValue('mock-message-id'),
    sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  }),
}));

jest.mock('node-cron', () => ({ schedule: jest.fn() }));

// Stub only the outbound send paths; keep the rest of the service real.
jest.mock('../../src/services/system/notification.service', () => ({
  ...jest.requireActual('../../src/services/system/notification.service'),
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
  sendManualNotificationSingle: jest.fn().mockResolvedValue({ success: true, sent: 1 }),
  sendManualNotificationBulk: jest.fn().mockResolvedValue({ success: true, sent: 2, failed: 0 }),
}));

// Faithful auth harness: 401 on missing token, real user load, rights from userType,
// and enforcement of the route's requiredRights (so a patient is 403'd on admin endpoints).
jest.mock('../../src/middlewares/auth', () => {
  const httpStatusInner = require('http-status');
  return (...requiredRights) =>
    async (req, res, next) => {
      try {
        if (!req.headers.authorization) {
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
        req.user = { ...dbUser.toJSON(), centerId: authState.centerId ?? dbUser.centerId, userType, role: { rights } };
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

setupTestDB();
cleanTables(['Patients', 'Users', 'Centers']);

beforeAll(async () => {
  app = require('../../src/app');
});

describe('POST /api/v1/notifications/send-manual', () => {
  let center;
  let adminUser;
  let patientUser;
  let patientOne;
  let patientTwo;

  const asAdmin = () => {
    global.__TEST_AUTH__ = { userId: adminUser.id, centerId: center.id, userType: 'admin' };
  };

  beforeEach(async () => {
    jest.clearAllMocks(); // reset mock CALL history per test (implementations persist)
    center = await Center.create(testDataFactories.createCenterData({ code: `NC_${Date.now()}` }));

    adminUser = await User.create(
      testDataFactories.createUserData(center.id, { email: `admin_${Date.now()}@t.com`, userType: 'admin', name: 'Admin' })
    );
    patientUser = await User.create(
      testDataFactories.createUserData(center.id, { email: `pu_${Date.now()}@t.com`, userType: 'patient', name: 'P' })
    );

    patientOne = await Patient.create(
      testDataFactories.createPatientData(patientUser.id, center.id, { code: `PA_${Date.now()}` })
    );
    const patientUser2 = await User.create(
      testDataFactories.createUserData(center.id, { email: `pu2_${Date.now()}@t.com`, userType: 'patient', name: 'P2' })
    );
    patientTwo = await Patient.create(
      testDataFactories.createPatientData(patientUser2.id, center.id, { code: `PB_${Date.now()}` })
    );

    asAdmin();
  });

  describe('Validation', () => {
    it('returns 400 when neither patientId nor patientIds is provided', async () => {
      // xor('patientId','patientIds') with neither present → Joi object.missing → 400.
      const res = await request(app)
        .post('/api/v1/notifications/send-manual')
        .set('Authorization', 'Bearer admintoken')
        .send({ channel: 'web', content: 'Test notification' })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toBeTruthy();
    });

    it('returns 400 when both patientId and patientIds are provided', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send-manual')
        .set('Authorization', 'Bearer admintoken')
        .send({
          patientId: patientOne.id,
          patientIds: [patientOne.id, patientTwo.id],
          channel: 'web',
          content: 'Test notification',
        })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toContain('patientId');
    });

    it('returns 400 when channel is invalid', async () => {
      await request(app)
        .post('/api/v1/notifications/send-manual')
        .set('Authorization', 'Bearer admintoken')
        .send({ patientIds: [patientOne.id], channel: 'invalid', content: 'Test notification' })
        .expect(httpStatus.BAD_REQUEST);
    });

    it('returns 400 when neither templateId nor content is provided', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/send-manual')
        .set('Authorization', 'Bearer admintoken')
        .send({ patientIds: [patientOne.id], channel: 'web' })
        .expect(httpStatus.BAD_REQUEST);

      expect(res.body.message).toMatch(/templateId|content/);
    });

    it('accepts a patientIds array → 200 and routes to the bulk send path', async () => {
      const notificationService = require('../../src/services/system/notification.service');
      const res = await request(app)
        .post('/api/v1/notifications/send-manual')
        .set('Authorization', 'Bearer admintoken')
        .send({ patientIds: [patientOne.id, patientTwo.id], channel: 'web', content: 'Test notification' })
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(notificationService.sendManualNotificationBulk).toHaveBeenCalledTimes(1);
      expect(notificationService.sendManualNotificationSingle).not.toHaveBeenCalled();
    });

    it('accepts a single patientId → 200 and routes to the single send path', async () => {
      const notificationService = require('../../src/services/system/notification.service');
      const res = await request(app)
        .post('/api/v1/notifications/send-manual')
        .set('Authorization', 'Bearer admintoken')
        .send({ patientId: patientOne.id, channel: 'web', content: 'Test notification' })
        .expect(httpStatus.OK);

      expect(res.body.success).toBe(true);
      expect(notificationService.sendManualNotificationSingle).toHaveBeenCalledTimes(1);
      expect(notificationService.sendManualNotificationBulk).not.toHaveBeenCalled();
    });

    it('injects centerId from the authenticated user (not required in the body) → 200', async () => {
      const notificationService = require('../../src/services/system/notification.service');
      await request(app)
        .post('/api/v1/notifications/send-manual')
        .set('Authorization', 'Bearer admintoken')
        .send({ patientIds: [patientOne.id], channel: 'web', content: 'Test notification' })
        .expect(httpStatus.OK);

      // injectData('body') must have populated centerId from req.user before the service ran.
      const bodyArg = notificationService.sendManualNotificationBulk.mock.calls[0][0];
      expect(bodyArg.centerId).toBe(center.id);
    });
  });

  describe('Authorization', () => {
    it('returns 401 without an auth token', async () => {
      await request(app)
        .post('/api/v1/notifications/send-manual')
        .send({ patientIds: [patientOne.id], channel: 'web', content: 'Test notification' })
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('returns 403 when the user lacks manageNotifications (patient)', async () => {
      global.__TEST_AUTH__ = { userId: patientUser.id, centerId: center.id, userType: 'patient' };

      await request(app)
        .post('/api/v1/notifications/send-manual')
        .set('Authorization', 'Bearer patienttoken')
        .send({ patientIds: [patientOne.id], channel: 'web', content: 'Test notification' })
        .expect(httpStatus.FORBIDDEN);
    });
  });
});
