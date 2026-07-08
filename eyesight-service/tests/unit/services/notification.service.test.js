const ApiError = require('../../../src/utils/ApiError');

// Mock firebase admin and models BEFORE importing services
jest.mock('../../../src/utils/firebaseAdmin', () => ({
  messaging: () => ({
    send: jest.fn(),
  }),
}));

jest.mock('../../../src/models', () => {
  const mockNotification = {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    isDuplicateCode: jest.fn().mockResolvedValue(false),
    destroy: jest.fn(),
    count: jest.fn(),
  };
  return {
    Notification: mockNotification,
    User: {},
    sequelize: {
      transaction: jest.fn(),
      close: jest.fn(),
    },
  };
});

// Mock all service dependencies
jest.mock('../../../src/services/clinic/patient.service');
jest.mock('../../../src/services/email.service');
jest.mock('../../../src/services/zalo.service');
jest.mock('../../../src/services/common/fcm.service');
jest.mock('../../../src/services/system/notificationTemplate.service');

// Now import services after mocks are set up
const notificationService = require('../../../src/services/system/notification.service');
const patientService = require('../../../src/services/clinic/patient.service');
const emailService = require('../../../src/services/email.service');
const { Notification } = require('../../../src/models');

describe('Notification Service - Manual Notification Refactoring', () => {
  const mockUser = {
    id: 1,
    centerId: 1,
    name: 'Test User',
  };

  const mockPatient = {
    id: 1,
    code: 'P001',
    fullName: 'Test Patient',
    userId: 10,
    centerId: 1,
    user: {
      id: 10,
      name: 'Test Patient',
      email: 'patient@test.com',
      phoneNumber: '0123456789',
    },
    center: {
      id: 1,
      name: 'Test Center',
    },
    doctor: {
      user: {
        name: 'Dr. Test',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendManualNotificationSingle', () => {
    it('should exist as a function', () => {
      expect(typeof notificationService.sendManualNotificationSingle).toBe('function');
    });

    it('should throw error if no template and no content provided', async () => {
      await expect(
        notificationService.sendManualNotificationSingle(
          {
            patientId: 1,
            channel: 'web',
          },
          mockUser
        )
      ).rejects.toThrow(ApiError);
    });

    it('should throw error if patient not found', async () => {
      patientService.getPatientById.mockResolvedValue(null);

      await expect(
        notificationService.sendManualNotificationSingle(
          {
            patientId: 999,
            channel: 'web',
            content: 'Test',
          },
          mockUser
        )
      ).rejects.toThrow('Bệnh nhân không tồn tại');
    });

    it('should throw error if patient belongs to different center', async () => {
      patientService.getPatientById.mockResolvedValue({
        ...mockPatient,
        centerId: 999,
      });

      await expect(
        notificationService.sendManualNotificationSingle(
          {
            patientId: 1,
            channel: 'web',
            content: 'Test',
          },
          mockUser
        )
      ).rejects.toThrow('Bệnh nhân không thuộc trung tâm của bạn');
    });

    it('should throw error if email channel but patient has no email', async () => {
      patientService.getPatientById.mockResolvedValue({
        ...mockPatient,
        user: { ...mockPatient.user, email: null },
      });

      await expect(
        notificationService.sendManualNotificationSingle(
          {
            patientId: 1,
            channel: 'email',
            content: 'Test',
          },
          mockUser
        )
      ).rejects.toThrow('Bệnh nhân không có email');
    });

    it('should render template variables in content', async () => {
      patientService.getPatientById.mockResolvedValue(mockPatient);
      emailService.sendEmail.mockResolvedValue({ success: true });

      // Mock Notification.create
      Notification.create.mockResolvedValue({
        id: 1,
        title: 'Hello Test Patient',
        message: 'Your code is P001',
      });

      const _result = await notificationService.sendManualNotificationSingle(
        {
          patientId: 1,
          channel: 'email',
          subject: 'Hello {{patientName}}',
          content: 'Your code is {{patientCode}}',
        },
        mockUser
      );

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Hello Test Patient',
          message: 'Your code is P001',
        })
      );
    });
  });

  describe('sendManualNotificationBulk', () => {
    it('should exist as a function', () => {
      expect(typeof notificationService.sendManualNotificationBulk).toBe('function');
    });

    it('should throw error if no template and no content provided', async () => {
      await expect(
        notificationService.sendManualNotificationBulk(
          {
            patientIds: [1],
            channel: 'web',
          },
          mockUser
        )
      ).rejects.toThrow(ApiError);
    });

    it('should process multiple patients and return results', async () => {
      patientService.getPatientById.mockResolvedValue(mockPatient);

      // Mock Notification.create
      Notification.create.mockResolvedValue({
        id: 1,
        title: 'Test',
        message: 'Test message',
      });

      const result = await notificationService.sendManualNotificationBulk(
        {
          patientIds: [1, 2],
          channel: 'web',
          content: 'Test notification',
        },
        mockUser
      );

      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('details');
      expect(Array.isArray(result.details)).toBe(true);
      expect(result.details.length).toBe(2);
    });

    it('should handle individual patient failures gracefully', async () => {
      // First patient succeeds, second fails
      patientService.getPatientById.mockResolvedValueOnce(mockPatient).mockResolvedValueOnce(null);

      Notification.create.mockResolvedValue({
        id: 1,
        title: 'Test',
        message: 'Test',
      });

      const result = await notificationService.sendManualNotificationBulk(
        {
          patientIds: [1, 999],
          channel: 'web',
          content: 'Test',
        },
        mockUser
      );

      expect(result.total).toBe(2);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.details[0].success).toBe(true);
      expect(result.details[1].success).toBe(false);
      expect(result.details[1].error).toBe('Bệnh nhân không tồn tại');
    });
  });

  describe('renderVariables helper', () => {
    it('should be used internally to render template variables', async () => {
      patientService.getPatientById.mockResolvedValue(mockPatient);

      Notification.create.mockResolvedValue({
        id: 1,
        title: 'Hi Test Patient from Test Center',
        message: 'Doctor: Dr. Test, Code: P001',
      });

      await notificationService.sendManualNotificationSingle(
        {
          patientId: 1,
          channel: 'web',
          subject: 'Hi {{patientName}} from {{centerName}}',
          content: 'Doctor: {{doctorName}}, Code: {{patientCode}}',
        },
        mockUser
      );

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Hi Test Patient from Test Center',
          message: 'Doctor: Dr. Test, Code: P001',
        })
      );
    });
  });
});
