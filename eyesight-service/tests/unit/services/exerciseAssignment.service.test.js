jest.mock('../../../src/models', () => ({
  Exercise: {},
  ExerciseAssignment: {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
  ExerciseConfig: {
    findByPk: jest.fn(),
  },
  Patient: {
    findAll: jest.fn(),
  },
  User: {
    findAll: jest.fn(),
  },
  ExerciseResult: {},
  ExerciseSession: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../../src/utils/patterns', () => ({
  standardQuery: jest.fn(),
  standardCreate: jest.fn(),
  standardUpdate: jest.fn(),
  standardSoftDelete: jest.fn(),
  standardBulkSoftDelete: jest.fn(),
  standardGetById: jest.fn(),
  standardGetByField: jest.fn(),
  withTransaction: jest.fn(async (callback) => callback({ id: 'tx' })),
}));

jest.mock('../../../src/services/exercise/assignmentSessionSync.service', () => ({
  syncAssignmentSessionSnapshots: jest.fn().mockResolvedValue({ updated: 0 }),
}));

jest.mock('../../../src/utils/sessionProvisionUtils', () => ({
  provisionExerciseSessions: jest.fn(),
}));

jest.mock('../../../src/services/system/auditLog.service', () => ({
  logEntityAuditEvent: jest.fn(),
}));

jest.mock('../../../src/config/db', () => ({
  sequelize: {
    fn: jest.fn(),
    col: jest.fn(),
  },
}));

jest.mock('../../../src/utils/common', () => ({
  generateCode: jest.fn(() => 'SS_TEST'),
  getCurrentCycleDateRange: jest.fn(() => ({
    start: new Date('2026-06-30T00:00:00.000+07:00'),
    end: new Date('2026-06-30T23:59:59.999+07:00'),
  })),
}));

jest.mock('../../../src/services/exercise/exerciseAssignment.service', () =>
  jest.requireActual('../../../src/services/exercise/exerciseAssignment.service')
);

const httpStatus = require('http-status');
const ApiError = require('../../../src/utils/ApiError');
const exerciseAssignmentService = require('../../../src/services/exercise/exerciseAssignment.service');
const exerciseSessionService = require('../../../src/services/exercise/exerciseSession.service');
const { ExerciseAssignment, ExerciseConfig, Patient, User, ExerciseSession } = require('../../../src/models');
const auditLogService = require('../../../src/services/system/auditLog.service');
const { standardQuery } = require('../../../src/utils/patterns');
const { provisionExerciseSessions } = require('../../../src/utils/sessionProvisionUtils');
const { syncAssignmentSessionSnapshots } = require('../../../src/services/exercise/assignmentSessionSync.service');

describe('Exercise Assignment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignConfigToPatients', () => {
    test('should assign config to a patient successfully', async () => {
      const config = { id: 10, centerId: 5, visionType: 'far' };
      const assignment = { id: 20, patientId: 1, exerciseConfigId: 10, centerId: 5 };
      ExerciseConfig.findByPk.mockResolvedValue(config);
      Patient.findAll.mockResolvedValue([{ id: 1, deleted: false }]);
      ExerciseAssignment.findAll.mockResolvedValue([]);
      ExerciseAssignment.bulkCreate.mockResolvedValue([assignment]);
      ExerciseAssignment.findByPk.mockResolvedValue({ ...assignment, exerciseConfig: config });

      const result = await exerciseAssignmentService.assignConfigToPatients(10, [1], {
        assignedBy: 99,
        visionLevel: 12,
        levelOverride: true,
      });
      await new Promise((resolve) => setImmediate(resolve));

      expect(result).toEqual([assignment]);
      expect(ExerciseAssignment.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            patientId: 1,
            exerciseConfigId: 10,
            assignedBy: 99,
            visionLevel: 12,
            levelOverride: true,
          }),
        ],
        expect.objectContaining({ returning: true })
      );
      expect(provisionExerciseSessions).toHaveBeenCalled();
      expect(auditLogService.logEntityAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'exerciseAssignment.assign',
          centerId: 5,
        })
      );
    });

    test('should treat duplicate assignment selection as a no-op', async () => {
      ExerciseConfig.findByPk.mockResolvedValue({ id: 10, centerId: 5, visionType: 'far' });
      Patient.findAll.mockResolvedValue([{ id: 1, deleted: false }]);
      ExerciseAssignment.findAll.mockResolvedValue([{ id: 20, patientId: 1, exerciseConfigId: 10, centerId: 5 }]);

      const result = await exerciseAssignmentService.assignConfigToPatients(10, [1], { assignedBy: 99 });

      expect(result).toEqual([]);
      expect(ExerciseAssignment.bulkCreate).not.toHaveBeenCalled();
    });

    test('should validate vision level against config vision type', async () => {
      ExerciseConfig.findByPk.mockResolvedValue({ id: 10, centerId: 5, visionType: 'far' });
      Patient.findAll.mockResolvedValue([{ id: 1, deleted: false }]);
      ExerciseAssignment.findAll.mockResolvedValue([]);

      await expect(
        exerciseAssignmentService.assignConfigToPatients(10, [1], { assignedBy: 99, visionLevel: 25 })
      ).rejects.toMatchObject({
        statusCode: httpStatus.BAD_REQUEST,
      });
    });

    test('should reject missing config or patient selection mismatches', async () => {
      ExerciseConfig.findByPk.mockResolvedValue(null);

      await expect(exerciseAssignmentService.assignConfigToPatients(10, [1], { assignedBy: 99 })).rejects.toThrow(
        'Cấu hình bài tập không tồn tại'
      );

      ExerciseConfig.findByPk.mockResolvedValue({ id: 10, centerId: 5, visionType: 'far' });
      Patient.findAll.mockResolvedValue([]);

      await expect(exerciseAssignmentService.assignConfigToPatients(10, [1], { assignedBy: 99 })).rejects.toThrow(
        'Một hoặc nhiều bệnh nhân không tồn tại'
      );
    });
  });

  describe('getPatientAssignments', () => {
    test('should attach the current-cycle session as currentSession', async () => {
      const assignment = {
        id: 20,
        patientId: 1,
        exerciseConfig: { frequency: 'daily', exercise: { name: '2048' } },
        dataValues: {},
      };
      const session = { id: 30, executionsCompleted: 0 };
      standardQuery.mockResolvedValue({ rows: [assignment], total: 1, totalPages: 1, page: 1, limit: 10 });
      provisionExerciseSessions.mockResolvedValue(1);
      ExerciseSession.findOne.mockResolvedValue(session);

      const result = await exerciseAssignmentService.getPatientAssignments({ patientId: 1 }, { limit: 10, page: 1 });

      expect(provisionExerciseSessions).toHaveBeenCalledWith(assignment);
      expect(result.rows[0].dataValues.currentSession).toEqual(session);
      expect(ExerciseSession.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            exerciseAssignmentId: 20,
            startedAt: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('getAssignmentById', () => {
    test('should return assignment with included relations', async () => {
      const assignment = { id: 20, exerciseConfig: { exercise: {} }, patient: { user: {} } };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);

      const result = await exerciseAssignmentService.getAssignmentById(20);

      expect(result).toBe(assignment);
      expect(ExerciseAssignment.findByPk).toHaveBeenCalledWith(20, expect.objectContaining({ include: expect.any(Array) }));
    });
  });

  describe('updateAssignment', () => {
    test('should update an assignment in place', async () => {
      const updated = { id: 20, centerId: 5, patientId: 1, exerciseConfigId: 10, status: 'paused' };
      const assignment = {
        id: 20,
        exerciseConfigId: 10,
        update: jest.fn().mockResolvedValue(updated),
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);

      const result = await exerciseAssignmentService.updateAssignment(20, { status: 'paused' });

      expect(result).toBe(updated);
      expect(assignment.update).toHaveBeenCalledWith({ status: 'paused' });
      expect(syncAssignmentSessionSnapshots).not.toHaveBeenCalled();
      expect(auditLogService.logEntityAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'exerciseAssignment.update',
          entityId: 20,
        })
      );
    });

    test('should sync incomplete sessions when exerciseConfigId changes', async () => {
      const updated = { id: 20, centerId: 5, patientId: 1, exerciseConfigId: 11, status: 'active' };
      const assignment = {
        id: 20,
        exerciseConfigId: 10,
        update: jest.fn().mockResolvedValue(updated),
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);

      await exerciseAssignmentService.updateAssignment(20, { exerciseConfigId: 11 });

      expect(syncAssignmentSessionSnapshots).toHaveBeenCalledWith(20);
    });

    test('should throw for unknown assignment updates', async () => {
      ExerciseAssignment.findByPk.mockResolvedValue(null);

      await expect(exerciseAssignmentService.updateAssignment(999, { status: 'paused' })).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe('removeAssignment', () => {
    test('should destroy the assignment and log the audit event', async () => {
      const assignment = {
        get: jest.fn().mockReturnValue({ id: 20, centerId: 5, patientId: 1, exerciseConfigId: 10, status: 'active' }),
        destroy: jest.fn().mockResolvedValue(),
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);

      await exerciseAssignmentService.removeAssignment(20, { updatedBy: 99 });

      expect(assignment.destroy).toHaveBeenCalled();
      expect(auditLogService.logEntityAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'exerciseAssignment.delete',
          entityId: 20,
          actorUserId: 99,
        })
      );
    });
  });

  describe('getSessionProgress', () => {
    test('should return startable progress when no session exists today', async () => {
      ExerciseAssignment.findByPk.mockResolvedValue({ id: 20, exerciseConfig: { executionCount: 3 } });
      ExerciseSession.findOne.mockResolvedValue(null);

      const result = await exerciseSessionService.getSessionProgress(20, new Date('2026-03-27T10:00:00.000Z'));

      expect(result).toEqual(
        expect.objectContaining({
          assignmentId: 20,
          sessionExists: false,
          required: 3,
          canStart: true,
        })
      );
    });

    test('should return computed progress when a session exists today', async () => {
      ExerciseAssignment.findByPk.mockResolvedValue({ id: 20, exerciseConfig: { executionCount: 3 } });
      ExerciseSession.findOne.mockResolvedValue({
        id: 30,
        status: 'incomplete',
        executionsCompleted: 2,
        validExecutions: 2,
        totalScore: 200,
        averageScore: 100,
        bestScore: 120,
      });

      const result = await exerciseSessionService.getSessionProgress(20, new Date('2026-03-27T10:00:00.000Z'));

      expect(result).toEqual(
        expect.objectContaining({
          assignmentId: 20,
          sessionExists: true,
          completed: 2,
          required: 3,
          percentage: 67,
          isCompleted: false,
          bestScore: 120,
        })
      );
    });
  });

  describe('getConfigAssignments', () => {
    test('should backfill assignedByUser details when standardQuery omits them', async () => {
      const assignment = {
        assignedBy: 99,
        assignedByUser: null,
        dataValues: {},
      };
      standardQuery.mockResolvedValue({ rows: [assignment], total: 1, totalPages: 1, page: 1, limit: 10 });
      User.findAll.mockResolvedValue([{ id: 99, name: 'Doctor', email: 'doctor@test.com' }]);

      const result = await exerciseAssignmentService.getConfigAssignments(10, 5, {}, { limit: 10, page: 1 });

      expect(result.rows[0].dataValues.assignedByUser).toEqual({ id: 99, name: 'Doctor', email: 'doctor@test.com' });
      expect(User.findAll).toHaveBeenCalled();
    });
  });
});
