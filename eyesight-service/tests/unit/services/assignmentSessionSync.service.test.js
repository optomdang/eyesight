jest.mock('../../../src/models', () => ({
  ExerciseAssignment: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  ExerciseSession: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../../../src/utils/common', () => ({
  getCurrentCycleDateRange: jest.fn(() => ({
    start: new Date('2026-08-07T00:00:00.000+07:00'),
    end: new Date('2026-08-07T23:59:59.999+07:00'),
  })),
}));

jest.mock('../../../src/services/exercise/exerciseResult.service', () => ({
  updateSessionStats: jest.fn(),
}));

const { ExerciseAssignment, ExerciseSession } = require('../../../src/models');
const { updateSessionStats } = require('../../../src/services/exercise/exerciseResult.service');
const {
  snapshotsDiffer,
  isSessionFullyComplete,
  reconcileCurrentCycleSession,
  reconcileSessionWithConfigRequirement,
  syncAssignmentSessionSnapshots,
  syncSessionSnapshotFromAssignment,
  syncSessionsForExerciseConfig,
} = require('../../../src/services/exercise/assignmentSessionSync.service');

describe('assignmentSessionSync.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('snapshotsDiffer', () => {
    test('detects duration mismatch (30 vs 10)', () => {
      expect(
        snapshotsDiffer({ executionDuration: 30, executionCount: 2 }, 10, 2)
      ).toBe(true);
    });

    test('treats DECIMAL strings as equal', () => {
      expect(
        snapshotsDiffer({ executionDuration: '10.00', executionCount: '2' }, 10, 2)
      ).toBe(false);
    });
  });

  describe('syncSessionSnapshotFromAssignment', () => {
    test('updates incomplete session and recalculates stats', async () => {
      const session = {
        id: 50,
        status: 'incomplete',
        executionDuration: 30,
        executionCount: 2,
        update: jest.fn().mockResolvedValue(),
      };
      const assignment = {
        exerciseConfig: { duration: 10, executionCount: 2 },
      };

      const changed = await syncSessionSnapshotFromAssignment(session, assignment);

      expect(changed).toBe(true);
      expect(session.update).toHaveBeenCalledWith({
        executionDuration: 10,
        executionCount: 2,
      });
      expect(updateSessionStats).toHaveBeenCalledWith(50);
    });

    test('skips completed sessions', async () => {
      const session = {
        id: 50,
        status: 'completed',
        executionDuration: 30,
        executionCount: 2,
        update: jest.fn(),
      };

      const changed = await syncSessionSnapshotFromAssignment(session, {
        exerciseConfig: { duration: 10, executionCount: 2 },
      });

      expect(changed).toBe(false);
      expect(session.update).not.toHaveBeenCalled();
    });
  });

  describe('syncAssignmentSessionSnapshots', () => {
    test('syncs all incomplete sessions for assignment', async () => {
      const assignment = {
        id: 8,
        exerciseConfig: { duration: 10, executionCount: 2 },
      };
      ExerciseAssignment.findByPk.mockResolvedValue(assignment);
      const session = {
        id: 80,
        status: 'incomplete',
        executionDuration: 30,
        executionCount: 2,
        update: jest.fn().mockResolvedValue(),
      };
      ExerciseSession.findAll.mockResolvedValue([session]);

      const result = await syncAssignmentSessionSnapshots(8);

      expect(result).toEqual({ updated: 1 });
      expect(session.update).toHaveBeenCalledWith({
        executionDuration: 10,
        executionCount: 2,
      });
      expect(updateSessionStats).toHaveBeenCalledWith(80);
    });
  });

  describe('isSessionFullyComplete', () => {
    test('requires validExecutions to meet config executionCount', () => {
      expect(
        isSessionFullyComplete(
          { validExecutions: 2, executionCount: 2, status: 'completed' },
          { executionCount: 4 }
        )
      ).toBe(false);
      expect(
        isSessionFullyComplete(
          { validExecutions: 4, executionCount: 4, status: 'completed' },
          { executionCount: 4 }
        )
      ).toBe(true);
    });
  });

  describe('reconcileSessionWithConfigRequirement', () => {
    test('reopens completed session when config now requires more executions', async () => {
      const session = {
        id: 240,
        status: 'completed',
        validExecutions: 2,
        executionsCompleted: 2,
        executionCount: 2,
        executionDuration: '5.00',
        completedAt: new Date(),
        endedAt: new Date(),
        update: jest.fn().mockResolvedValue(),
      };
      const assignment = {
        exerciseConfig: { duration: '5.00', executionCount: 4, frequency: 'daily' },
      };

      const changed = await reconcileSessionWithConfigRequirement(session, assignment);

      expect(changed).toBe(true);
      expect(session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          executionCount: 4,
          status: 'incomplete',
          completedAt: null,
          endedAt: null,
        })
      );
      expect(updateSessionStats).toHaveBeenCalledWith(240);
    });
  });

  describe('reconcileCurrentCycleSession', () => {
    test('reconciles only the current cycle session for the assignment', async () => {
      ExerciseAssignment.findByPk.mockResolvedValue({
        id: 5,
        exerciseConfig: { duration: '5.00', executionCount: 4, frequency: 'daily' },
      });
      const session = {
        id: 240,
        status: 'completed',
        validExecutions: 2,
        executionsCompleted: 2,
        executionCount: 2,
        executionDuration: '5.00',
        completedAt: new Date(),
        endedAt: new Date(),
        update: jest.fn().mockResolvedValue(),
      };
      ExerciseSession.findOne.mockResolvedValue(session);

      const result = await reconcileCurrentCycleSession(5);

      expect(result).toEqual({ reconciled: true });
      expect(ExerciseSession.findOne).toHaveBeenCalled();
    });
  });

  describe('syncSessionsForExerciseConfig', () => {
    test('fans out to every active assignment using the config', async () => {
      ExerciseAssignment.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      ExerciseAssignment.findByPk
        .mockResolvedValueOnce({
          id: 1,
          exerciseConfig: { duration: 10, executionCount: 2 },
        })
        .mockResolvedValueOnce({
          id: 2,
          exerciseConfig: { duration: 10, executionCount: 2 },
        });
      ExerciseSession.findAll.mockResolvedValue([]);

      const result = await syncSessionsForExerciseConfig(99);

      expect(result).toEqual({ assignments: 2, sessionsUpdated: 0 });
      expect(ExerciseAssignment.findAll).toHaveBeenCalledWith({
        where: { exerciseConfigId: 99, status: 'active' },
        attributes: ['id'],
      });
    });
  });
});
