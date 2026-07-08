jest.mock('../../../src/models', () => ({
  ExerciseAssignment: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
  ExerciseConfig: {},
  Patient: {},
  User: {},
  Exercise: {},
  Notification: {},
}));

jest.mock('../../../src/services/index', () => ({
  exerciseNotificationService: {
    sendComplianceReminder: jest.fn(),
  },
}));

jest.mock('../../../src/services/system/auditLog.service', () => ({
  logEntityAuditEvent: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const { ExerciseAssignment } = require('../../../src/models');
const auditLogService = require('../../../src/services/system/auditLog.service');
const exerciseComplianceService = require('../../../src/services/exercise/exerciseCompliance.service');

describe('ExerciseCompliance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pauseAssignment', () => {
    test('should pause assignment, set paused compliance, and clear next due date', async () => {
      const assignment = {
        id: 12,
        notes: 'Existing note',
        update: jest.fn().mockResolvedValue(true),
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);

      const result = await exerciseComplianceService.pauseAssignment(12, { reason: 'Patient requested pause' });

      expect(ExerciseAssignment.findByPk).toHaveBeenCalledWith(12);
      expect(assignment.update).toHaveBeenCalledWith({
        status: 'paused',
        complianceStatus: 'paused',
        notes: 'Patient requested pause',
        nextDueDate: null,
      });
      expect(auditLogService.logEntityAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'exerciseAssignment.pause',
          entityType: 'exerciseAssignment',
          entityId: 12,
        })
      );
      expect(result).toBe(assignment);
    });

    test('should preserve existing note when pause reason is omitted', async () => {
      const assignment = {
        id: 15,
        notes: 'Keep this note',
        update: jest.fn().mockResolvedValue(true),
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);

      await exerciseComplianceService.pauseAssignment(15, {});

      expect(assignment.update).toHaveBeenCalledWith({
        status: 'paused',
        complianceStatus: 'paused',
        notes: 'Keep this note',
        nextDueDate: null,
      });
    });
  });

  describe('resumeAssignment', () => {
    test('should resume assignment and recalculate next due date from lastSessionAt', async () => {
      const lastSessionAt = new Date('2026-03-10T08:00:00.000Z');
      const assignment = {
        id: 18,
        lastSessionAt,
        notificationCount: 3,
        exerciseConfig: {
          frequency: 'weekly',
        },
        update: jest.fn().mockResolvedValue(true),
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);

      const result = await exerciseComplianceService.resumeAssignment(18);
      const expectedNextDueDate = exerciseComplianceService.calculateNextDueDate('weekly', lastSessionAt);

      expect(ExerciseAssignment.findByPk).toHaveBeenCalledWith(18, {
        include: [
          {
            model: expect.anything(),
            as: 'exerciseConfig',
          },
        ],
      });
      expect(assignment.update).toHaveBeenCalledWith({
        status: 'active',
        complianceStatus: 'on_track',
        nextDueDate: expectedNextDueDate,
        notificationCount: 0,
      });
      expect(auditLogService.logEntityAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'exerciseAssignment.resume',
          entityType: 'exerciseAssignment',
          entityId: 18,
        })
      );
      expect(result).toBe(assignment);
    });

    test('should resume assignment with null next due date when config frequency is missing', async () => {
      const assignment = {
        id: 22,
        lastSessionAt: new Date('2026-03-10T08:00:00.000Z'),
        exerciseConfig: null,
        update: jest.fn().mockResolvedValue(true),
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);

      await exerciseComplianceService.resumeAssignment(22);

      expect(assignment.update).toHaveBeenCalledWith({
        status: 'active',
        complianceStatus: 'on_track',
        nextDueDate: null,
        notificationCount: 0,
      });
    });
  });
});
